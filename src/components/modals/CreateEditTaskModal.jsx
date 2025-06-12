import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';

// Helper function to generate a somewhat unique file name if needed
const generateStoragePath = (userId, taskId, file) => {
  const fileExt = file.name.split('.').pop();
  const fileNameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.'));
  // Sanitize filename: replace spaces and special characters
  const sanitizedFileName = fileNameWithoutExt.replace(/[^a-zA-Z0-9_.-]/g, '_');
  return `${userId}/${taskId}/${sanitizedFileName}_${Date.now()}.${fileExt}`;
};

const CreateEditTaskModal = ({ isOpen, onClose, task, onSave, propertiesList, staffList }) => {
  const { user } = useAuth(); // User needed for uploaded_by and storage path
  const [formData, setFormData] = useState({
    property_id: '', title: '', description: '', status: 'New',
    priority: 'Medium', due_date: '', assigned_to_user_id: '', task_notes: '',
  });

  const [selectedImages, setSelectedImages] = useState([]);
  const [selectedDocs, setSelectedDocs] = useState([]);
  const [existingFiles, setExistingFiles] = useState([]);
  const [filesToDelete, setFilesToDelete] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({}); // To show progress for individual files

  const statusOptions = ['New', 'In Progress', 'Blocked', 'Completed', 'Cancelled'];
  const priorityOptions = ['Low', 'Medium', 'High', 'Urgent'];

  const fetchTaskFiles = useCallback(async (currentTaskId) => {
    if (!currentTaskId) { setExistingFiles([]); return; }
    try {
      const { data, error: fetchFilesError } = await supabase
        .from('task_files')
        .select('id, task_id, file_name, storage_path, mime_type, file_size, is_deleted')
        .eq('task_id', currentTaskId).eq('is_deleted', false);
      if (fetchFilesError) throw fetchFilesError;
      setExistingFiles(data || []);
    } catch (err) {
      console.error('Error fetching task files:', err);
      // setError(err.message || 'Could not load existing files.'); // Avoid overriding main form error
      setExistingFiles([]);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setError(null); setFilesToDelete([]); setSelectedImages([]); setSelectedDocs([]); setUploadProgress({});
      if (task && task.task_id) {
        setFormData({
          property_id: task.property_id || '', title: task.task_title || task.title || '',
          description: task.task_description || task.description || '', status: task.task_status || task.status || 'New',
          priority: task.task_priority || task.priority || 'Medium',
          due_date: task.task_due_date || task.due_date ? new Date(task.task_due_date || task.due_date).toISOString().substring(0, 10) : '',
          assigned_to_user_id: task.assigned_to_user_id || '', task_notes: task.task_notes || '',
        });
        fetchTaskFiles(task.task_id);
      } else {
        setFormData({ property_id: '', title: '', description: '', status: 'New',
          priority: 'Medium', due_date: '', assigned_to_user_id: '', task_notes: '' });
        setExistingFiles([]);
      }
    }
  }, [task, isOpen, fetchTaskFiles]);

  const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  const handleImageFileChange = (e) => setSelectedImages([...e.target.files]);
  const handleDocFileChange = (e) => setSelectedDocs([...e.target.files]);
  const markFileForDeletion = (fileId) => {
    setFilesToDelete(prev => [...prev, fileId]);
    setExistingFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) { setError("User not authenticated."); return; }
    setLoading(true); setError(null); setUploadProgress({});

    let savedTaskData;
    try {
      // Step 1: Save/Update Task Details (excluding files)
      if (task && task.task_id) { // Editing
        const { data: updatedTask, error: updateTaskError } = await supabase.from('tasks')
          .update({ property_id: formData.property_id || null, title: formData.title, description: formData.description,
                    status: formData.status, priority: formData.priority, due_date: formData.due_date || null, task_notes: formData.task_notes })
          .eq('task_id', task.task_id).select().single();
        if (updateTaskError) throw updateTaskError;
        savedTaskData = updatedTask;
        // Check if assigned_to_user_id is truly different from current task's assigned_to_user_id
        const currentAssignee = task.assigned_to_user_id || ''; // Treat null/undefined as empty string for comparison
        const newAssignee = formData.assigned_to_user_id || '';
        if (newAssignee !== currentAssignee) {
            if (newAssignee) { // If there's a new assignee
                 await supabase.from('task_assignments').upsert({ task_id: task.task_id, user_id: newAssignee }, { onConflict: 'task_id' });
            } else { // If assignee is removed (newAssignee is empty but currentAssignee was not)
                 await supabase.from('task_assignments').delete().eq('task_id', task.task_id);
            }
        }

      } else { // Adding new task via Edge Function
        const { data: edgeResponse, error: edgeFunctionError } = await supabase.functions.invoke('create-task', {
          body: { taskDetails: { property_id: formData.property_id || null, title: formData.title, description: formData.description,
                                 status: formData.status, priority: formData.priority, due_date: formData.due_date || null,
                                 task_notes: formData.task_notes }, assigneeId: formData.assigned_to_user_id || null }});
        if (edgeFunctionError) throw edgeFunctionError;
        savedTaskData = edgeResponse?.created_task || edgeResponse;
        if (!savedTaskData || !savedTaskData.task_id) throw new Error("Failed to create task: No task ID returned.");
      }

      const currentTaskId = savedTaskData.task_id;

      // Step 2: Handle File Deletions
      if (filesToDelete.length > 0) {
        const { error: deleteFilesError } = await supabase.from('task_files')
          .update({ is_deleted: true })
          .in('id', filesToDelete);
        if (deleteFilesError) console.error('Error soft-deleting files:', deleteFilesError.message); // Log and continue
      }

      // Step 3: Handle File Uploads
      const newFilesToUpload = [
        ...Array.from(selectedImages).map(f => ({ file: f, bucket: 'task-images' })),
        ...Array.from(selectedDocs).map(f => ({ file: f, bucket: 'task-documents' }))
      ];

      const uploadedFilesMetadata = [];
      for (const { file, bucket } of newFilesToUpload) {
        const storagePath = generateStoragePath(user.id, currentTaskId, file);
        setUploadProgress(prev => ({ ...prev, [file.name]: { percent: 0, error: null } }));

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error(`Error uploading ${file.name}:`, uploadError.message);
          setUploadProgress(prev => ({ ...prev, [file.name]: { ...prev[file.name], error: uploadError.message } }));
          // setError(`Failed to upload ${file.name}. Task saved without this file.`); // This would overwrite other errors.
          continue;
        }
        setUploadProgress(prev => ({ ...prev, [file.name]: { ...prev[file.name], percent: 100 } }));

        uploadedFilesMetadata.push({
          task_id: currentTaskId,
          file_name: file.name,
          storage_path: storagePath,
          mime_type: file.type,
          file_size: file.size,
          uploaded_by: user.id,
        });
      }

      if (uploadedFilesMetadata.length > 0) {
        const { error: insertMetaError } = await supabase.from('task_files').insert(uploadedFilesMetadata);
        if (insertMetaError) {
          console.error('Error saving file metadata:', insertMetaError.message);
          setError(prevError => prevError ? `${prevError}\nFailed to save metadata for some uploaded files.` : 'Failed to save metadata for some uploaded files.');
        }
      }

      onSave(savedTaskData);
      handleClose();
    } catch (err) {
      console.error('Error in handleSubmit:', err);
      setError(err.message || 'An unexpected error occurred during save.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => { onClose(); };

  if (!isOpen) return null;

  return (
    <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1" role="dialog">
      <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content">
          <form onSubmit={handleSubmit}>
            <div className="modal-header">
              <h5 className="modal-title">{task && task.task_id ? 'Edit Task' : 'Create New Task'}</h5>
              <button type="button" className="btn-close" aria-label="Close" onClick={handleClose} disabled={loading}></button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-danger">{error}</div>}
              {Object.entries(uploadProgress).map(([fileName, progressStatus]) => (
                <div key={fileName} className="mb-1">
                  <small>{fileName}: {progressStatus.error ? <span className="text-danger">Error - {progressStatus.error}</span> : `${progressStatus.percent}%`}</small>
                  <div className="progress" style={{height: '5px'}}>
                    <div
                        className={`progress-bar ${progressStatus.error ? 'bg-danger' : (progressStatus.percent === 100 ? 'bg-success' : '')}`}
                        role="progressbar" style={{ width: `${progressStatus.percent}%`}}
                        aria-valuenow={progressStatus.percent} aria-valuemin="0" aria-valuemax="100">
                    </div>
                  </div>
                </div>
              ))}

              {/* Basic Task Fields */}
              <div className="mb-3"><label htmlFor="title" className="form-label">Title*</label><input type="text" className="form-control" id="title" name="title" value={formData.title} onChange={handleChange} required disabled={loading} /></div>
              <div className="mb-3"><label htmlFor="property_id" className="form-label">Property*</label><select className="form-select" id="property_id" name="property_id" value={formData.property_id} onChange={handleChange} required disabled={loading || !propertiesList}><option value="">Select Property...</option>{propertiesList && propertiesList.map(p => <option key={p.id} value={p.id}>{p.name} - {p.address_street}</option>)}</select></div>
              <div className="mb-3"><label htmlFor="description" className="form-label">Description</label><textarea className="form-control" id="description" name="description" rows="2" value={formData.description} onChange={handleChange} disabled={loading}></textarea></div>
              <div className="row"><div className="col-md-6 mb-3"><label htmlFor="status" className="form-label">Status*</label><select className="form-select" id="status" name="status" value={formData.status} onChange={handleChange} required disabled={loading}>{statusOptions.map(s => <option key={s} value={s}>{s}</option>)}</select></div><div className="col-md-6 mb-3"><label htmlFor="priority" className="form-label">Priority*</label><select className="form-select" id="priority" name="priority" value={formData.priority} onChange={handleChange} required disabled={loading}>{priorityOptions.map(p => <option key={p} value={p}>{p}</option>)}</select></div></div>
              <div className="row"><div className="col-md-6 mb-3"><label htmlFor="due_date" className="form-label">Due Date</label><input type="date" className="form-control" id="due_date" name="due_date" value={formData.due_date} onChange={handleChange} disabled={loading} /></div><div className="col-md-6 mb-3"><label htmlFor="assigned_to_user_id" className="form-label">Assign To</label><select className="form-select" id="assigned_to_user_id" name="assigned_to_user_id" value={formData.assigned_to_user_id} onChange={handleChange} disabled={loading || !staffList}><option value="">Unassigned</option>{staffList && staffList.map(s => <option key={s.id} value={s.id}>{s.full_name || s.email}</option>)}</select></div></div>
              <div className="mb-3"><label htmlFor="task_notes" className="form-label">Notes</label><textarea className="form-control" id="task_notes" name="task_notes" rows="2" value={formData.task_notes} onChange={handleChange} disabled={loading}></textarea></div>

              <hr /><h6 className="mt-3">Attachments</h6>
              {existingFiles.length > 0 && (<div className="mb-3"><p>Current files:</p><ul className="list-group list-group-flush">
                  {existingFiles.map(file => ( <li key={file.id} className="list-group-item d-flex justify-content-between align-items-center"><span><i className={`bi bi-file-earmark${file.mime_type?.startsWith('image/') ? '-image' : (file.mime_type === 'application/pdf' ? '-pdf' : '')} me-2`}></i>{file.file_name} <small className="text-muted">({(file.file_size / 1024).toFixed(1)} KB)</small></span><button type="button" className="btn btn-sm btn-outline-danger" onClick={() => markFileForDeletion(file.id)} disabled={loading}><i className="bi bi-trash"></i> Remove</button></li>))}
              </ul></div>)}
              {filesToDelete.length > 0 && <p className="text-warning small">Note: {filesToDelete.length} file(s) will be removed upon saving.</p>}
              <div className="mb-3"><label htmlFor="imageUpload" className="form-label">Upload Images</label><input type="file" className="form-control" id="imageUpload" multiple accept="image/*" onChange={handleImageFileChange} disabled={loading} />{selectedImages.length > 0 && <ul className="mt-1 list-unstyled small">{Array.from(selectedImages).map((file, idx) => <li key={idx}><i className="bi bi-image"></i> {file.name}</li>)}</ul>}</div>
              <div className="mb-3"><label htmlFor="docUpload" className="form-label">Upload Documents</label><input type="file" className="form-control" id="docUpload" multiple accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.csv" onChange={handleDocFileChange} disabled={loading} />{selectedDocs.length > 0 && <ul className="mt-1 list-unstyled small">{Array.from(selectedDocs).map((file, idx) => <li key={idx}><i className="bi bi-file-earmark-text"></i> {file.name}</li>)}</ul>}</div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={loading}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : (task && task.task_id ? 'Save Changes' : 'Create Task')}</button>
            </div>
          </form>
        </div>
      </div>
      {isOpen && <div className="modal-backdrop fade show"></div>}
    </div>
  );
};
export default CreateEditTaskModal;
