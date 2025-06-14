import React, { useState, useEffect, useCallback, useRef } from 'react'; // Added useRef
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
// Removed react-bootstrap imports: Modal, Button, Form, Row, Col

// SVG Icon Components
const IconX = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const IconFileGeneric = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);

const IconImageFile = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
  </svg>
);

const IconPdfFile = ({ className = "w-5 h-5" }) => ( // Example for PDF
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    <text x="50%" y="65%" dominantBaseline="middle" textAnchor="middle" fontSize="8px" fontWeight="bold" fill="currentColor">PDF</text>
  </svg>
);


const IconTrash = ({ className = "w-4 h-4" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12.56 0c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);


// Helper function to generate a somewhat unique file name
const generateStoragePath = (userId, taskId, file) => {
  const fileExt = file.name.split('.').pop();
  const fileNameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.'));
  // Sanitize filename: replace spaces and special characters
  const sanitizedFileName = fileNameWithoutExt.replace(/[^a-zA-Z0-9_.-]/g, '_');
  return `${userId}/${taskId}/${sanitizedFileName}_${Date.now()}.${fileExt}`;
};

const CreateEditTaskModal = ({ isOpen, onClose, task, onSave, propertiesList, staffList }) => {
  // modalRef and modalInstanceRef are no longer needed
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
      if (task && task.task_id) { // Editing
        const { data: updatedTask, error: updateTaskError } = await supabase.from('tasks')
          .update({ property_id: formData.property_id || null, title: formData.title, description: formData.description,
                    status: formData.status, priority: formData.priority, due_date: formData.due_date || null, task_notes: formData.task_notes })
          .eq('task_id', task.task_id).select().single();
        if (updateTaskError) throw updateTaskError;
        savedTaskData = updatedTask;
        const currentAssignee = task.assigned_to_user_id || '';
        const newAssignee = formData.assigned_to_user_id || '';
        if (newAssignee !== currentAssignee) {
            if (newAssignee) {
                 await supabase.from('task_assignments').upsert({ task_id: task.task_id, user_id: newAssignee }, { onConflict: 'task_id' });
            } else {
                 await supabase.from('task_assignments').delete().eq('task_id', task.task_id);
            }
        }
      } else { // Adding new task
        const { data: edgeResponse, error: edgeFunctionError } = await supabase.functions.invoke('create-task', {
          body: { taskDetails: { property_id: formData.property_id || null, title: formData.title, description: formData.description,
                                 status: formData.status, priority: formData.priority, due_date: formData.due_date || null,
                                 task_notes: formData.task_notes }, assigneeId: formData.assigned_to_user_id || null }});
        if (edgeFunctionError) throw edgeFunctionError;
        savedTaskData = edgeResponse?.created_task || edgeResponse;
        if (!savedTaskData || !savedTaskData.task_id) throw new Error("Failed to create task: No task ID returned.");
      }

      const currentTaskId = savedTaskData.task_id;
      if (filesToDelete.length > 0) {
        const { error: deleteFilesError } = await supabase.from('task_files')
          .update({ is_deleted: true })
          .in('id', filesToDelete);
        if (deleteFilesError) console.error('Error soft-deleting files:', deleteFilesError.message);
      }

      const newFilesToUpload = [
        ...Array.from(selectedImages).map(f => ({ file: f, bucket: 'task-images' })),
        ...Array.from(selectedDocs).map(f => ({ file: f, bucket: 'task-documents' }))
      ];
      const uploadedFilesMetadata = [];
      for (const { file, bucket } of newFilesToUpload) {
        const storagePath = generateStoragePath(user.id, currentTaskId, file);
        setUploadProgress(prev => ({ ...prev, [file.name]: { percent: 0, error: null } }));
        const { error: uploadError } = await supabase.storage.from(bucket)
          .upload(storagePath, file, { cacheControl: '3600', upsert: false });
        if (uploadError) {
          console.error(`Error uploading ${file.name}:`, uploadError.message);
          setUploadProgress(prev => ({ ...prev, [file.name]: { ...prev[file.name], error: uploadError.message } }));
          continue;
        }
        setUploadProgress(prev => ({ ...prev, [file.name]: { ...prev[file.name], percent: 100 } }));
        uploadedFilesMetadata.push({
          task_id: currentTaskId, file_name: file.name, storage_path: storagePath,
          mime_type: file.type, file_size: file.size, uploaded_by: user.id,
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
      onClose(); // Changed from handleClose to direct onClose
    } catch (err) {
      console.error('Error in handleSubmit:', err);
      setError(err.message || 'An unexpected error occurred during save.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => { onClose(); };
  const modalRef = useRef(null);

  // Handle backdrop click for "static" behavior
  const handleBackdropClick = (e) => {
    if (modalRef.current && e.target === modalRef.current) {
      // Optionally, you can add a visual cue like a slight shake animation here
      return;
    }
  };

  // Effect for entry/exit animation classes
  const [animationClass, setAnimationClass] = useState('opacity-0 scale-95');
  useEffect(() => {
    if (isOpen) {
      // Delay applying 'enter' animation classes to allow initial render in 'leave' state
      requestAnimationFrame(() => {
        setAnimationClass('opacity-100 scale-100');
      });
    } else {
      setAnimationClass('opacity-0 scale-95');
    }
  }, [isOpen]);


  if (!isOpen && animationClass === 'opacity-0 scale-95') { // Only render if isOpen or during exit animation
    return null;
  }

  return (
    <div
      ref={modalRef}
      onClick={handleBackdropClick} // Handle backdrop click
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`relative bg-white w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[95vh] transform transition-all duration-300 ease-in-out ${animationClass}`}
        onClick={(e) => e.stopPropagation()} // Prevent clicks inside modal from closing it
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center p-5 border-b border-slate-200">
          <h3 id="modal-title" className="text-xl font-semibold text-slate-800">
            {task && task.task_id ? 'Edit Task' : 'Create New Task'}
          </h3>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
            aria-label="Close modal"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-grow p-6 overflow-y-auto space-y-6"> {/* Increased space-y for better separation */}
          <form onSubmit={handleSubmit} id="task-form" className="space-y-6">
            {error && (
              <div className="p-3 mb-4 text-sm text-red-700 bg-red-100 border border-red-200 rounded-md">
                {error}
              </div>
            )}

            {Object.entries(uploadProgress).length > 0 && (
              <div className="space-y-2">
                {Object.entries(uploadProgress).map(([fileName, progressStatus]) => (
                  <div key={fileName} className="text-sm">
                    <div className="flex justify-between mb-0.5">
                      <span className="text-slate-700 font-medium truncate max-w-[200px] sm:max-w-xs">{fileName}</span>
                      <span className={`${progressStatus.error ? 'text-red-600' : 'text-slate-500'}`}>
                        {progressStatus.error ? `Error` : `${progressStatus.percent}%`}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-300 ease-in-out ${progressStatus.error ? 'bg-red-500' : (progressStatus.percent === 100 ? 'bg-green-500' : 'bg-blue-600')}`}
                        style={{ width: `${progressStatus.percent}%`}}
                      ></div>
                    </div>
                    {progressStatus.error && <p className="text-xs text-red-500 mt-0.5">{progressStatus.error}</p>}
                  </div>
                ))}
              </div>
            )}

            <div>
              <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">Title*</label>
              <input type="text" name="title" id="title" value={formData.title} onChange={handleChange} required disabled={loading}
                     className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500" />
            </div>

            <div>
              <label htmlFor="property_id" className="block text-sm font-medium text-slate-700 mb-1">Property*</label>
              <select name="property_id" id="property_id" value={formData.property_id} onChange={handleChange} required disabled={loading || !propertiesList}
                      className="block w-full pl-3 pr-10 py-2 text-sm border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500">
                <option value="">Select Property...</option>
                {propertiesList && propertiesList.map(p => <option key={p.id} value={p.id}>{p.property_name} - {p.address}</option>)}
              </select>
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea name="description" id="description" rows={3} value={formData.description} onChange={handleChange} disabled={loading}
                        className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500"></textarea>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-slate-700 mb-1">Status*</label>
                <select name="status" id="status" value={formData.status} onChange={handleChange} required disabled={loading}
                        className="block w-full pl-3 pr-10 py-2 text-sm border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500">
                  {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-slate-700 mb-1">Priority*</label>
                <select name="priority" id="priority" value={formData.priority} onChange={handleChange} required disabled={loading}
                        className="block w-full pl-3 pr-10 py-2 text-sm border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500">
                  {priorityOptions.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="due_date" className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                <input type="date" name="due_date" id="due_date" value={formData.due_date} onChange={handleChange} disabled={loading}
                       className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500" />
              </div>
              <div>
                <label htmlFor="assigned_to_user_id" className="block text-sm font-medium text-slate-700 mb-1">Assign To</label>
                <select name="assigned_to_user_id" id="assigned_to_user_id" value={formData.assigned_to_user_id} onChange={handleChange} disabled={loading || !staffList}
                        className="block w-full pl-3 pr-10 py-2 text-sm border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500">
                  <option value="">Unassigned</option>
                  {staffList && staffList.map(s => <option key={s.id} value={s.id}>{s.full_name || s.email}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="task_notes" className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea name="task_notes" id="task_notes" rows={3} value={formData.task_notes} onChange={handleChange} disabled={loading}
                        className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-50 disabled:text-slate-500"></textarea>
            </div>

            <hr className="border-slate-200 my-3" />

            <div>
                <h4 className="text-md font-semibold text-slate-800 mb-2">Attachments</h4>
                {existingFiles.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm text-slate-600 mb-1">Current files:</p>
                    <ul className="space-y-2">
                      {existingFiles.map(file => (
                        <li key={file.id} className="flex justify-between items-center py-2 px-3 border border-slate-200 rounded-lg bg-slate-50/50">
                          <div className="flex items-center gap-2 min-w-0">
                            {file.mime_type?.startsWith('image/') ? <IconImageFile className="w-5 h-5 text-slate-500 flex-shrink-0" /> :
                             (file.mime_type === 'application/pdf' ? <IconPdfFile className="w-5 h-5 text-slate-500 flex-shrink-0" /> : <IconFileGeneric className="w-5 h-5 text-slate-500 flex-shrink-0" />)}
                            <span className="text-sm text-slate-700 truncate" title={file.file_name}>{file.file_name}</span>
                            <span className="text-xs text-slate-500 whitespace-nowrap">({(file.file_size / 1024).toFixed(1)} KB)</span>
                          </div>
                          <button type="button" onClick={() => markFileForDeletion(file.id)} disabled={loading}
                                  className="p-1 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-md transition-colors disabled:opacity-50" aria-label="Remove file">
                            <IconTrash className="w-4 h-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {filesToDelete.length > 0 && <p className="p-2 mb-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md">Note: {filesToDelete.length} file(s) will be removed upon saving.</p>}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
                    <div>
                        <label htmlFor="imageUpload" className="block text-sm font-medium text-slate-700 mb-1">Upload Images</label>
                        <input type="file" id="imageUpload" multiple accept="image/*" onChange={handleImageFileChange} disabled={loading}
                               className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:pointer-events-none" />
                        {selectedImages.length > 0 && <ul className="mt-2 space-y-1">{Array.from(selectedImages).map((file, idx) => <li key={idx} className="text-xs text-slate-600 flex items-center gap-1.5"><IconImageFile className="w-4 h-4 text-slate-400" /> {file.name}</li>)}</ul>}
                    </div>
                    <div>
                        <label htmlFor="docUpload" className="block text-sm font-medium text-slate-700 mb-1">Upload Documents</label>
                        <input type="file" id="docUpload" multiple accept=".pdf,.doc,.docx,.txt,.xls,.xlsx,.csv" onChange={handleDocFileChange} disabled={loading}
                               className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:pointer-events-none" />
                        {selectedDocs.length > 0 && <ul className="mt-2 space-y-1">{Array.from(selectedDocs).map((file, idx) => <li key={idx} className="text-xs text-slate-600 flex items-center gap-1.5"><IconFileGeneric className="w-4 h-4 text-slate-400" /> {file.name}</li>)}</ul>}
                    </div>
                </div>
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end items-center gap-3 p-5 bg-slate-50 rounded-b-2xl border-t border-slate-200">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit" // Changed to submit, will trigger form's onSubmit
            form="task-form" // Associate with the form in the body
            disabled={loading}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Saving...' : (task && task.task_id ? 'Save Changes' : 'Create Task')}
          </button>
        </div>
      </div>
    </div>
  );
};
export default CreateEditTaskModal;
