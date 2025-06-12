import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext'; // For user ID if needed for RLS on files or getting signed URLs

const ViewTaskModal = ({ isOpen, onClose, task, onAttachmentDeleted, onTaskUpdated }) => {
  const { user, isAdmin } = useAuth();
  const [taskDetails, setTaskDetails] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchFullTaskDetails = useCallback(async () => {
    if (!task || !task.task_id) {
      setTaskDetails(null);
      setFiles([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // The 'task' prop should be rich enough for display from 'detailed_task_assignments'
      // which includes task_notes and task_description as per previous step.
      setTaskDetails(task);

      // Fetch associated files
      const { data: fileData, error: fileError } = await supabase
        .from('task_files')
        .select('id, file_name, storage_path, mime_type, file_size, uploaded_at, is_deleted, uploaded_by') // Added uploaded_by for delete check
        .eq('task_id', task.task_id)
        .eq('is_deleted', false)
        .order('uploaded_at', { ascending: true });

      if (fileError) throw fileError;
      setFiles(fileData || []);

    } catch (err) {
      console.error('Error fetching task details or files:', err);
      setError(err.message || 'Could not load task information.');
    } finally {
      setLoading(false);
    }
  }, [task]);

  useEffect(() => {
    if (isOpen) {
      fetchFullTaskDetails();
    } else {
      // Clear details when modal is closed to ensure fresh data next time
      setTaskDetails(null);
      setFiles([]);
      setError(null);
    }
  }, [isOpen, fetchFullTaskDetails]);

  const handleSoftDeleteAttachment = async (fileId) => {
    if (!window.confirm('Are you sure you want to remove this attachment?')) return;
    try {
      const { error: deleteError } = await supabase
        .from('task_files')
        .update({ is_deleted: true })
        .eq('id', fileId);
      if (deleteError) throw deleteError;
      // Refresh file list or notify parent to refresh
      setFiles(prevFiles => prevFiles.filter(f => f.id !== fileId));
      if (onAttachmentDeleted) onAttachmentDeleted(task.task_id, fileId); // Notify parent if needed
    } catch (err) {
      console.error('Error soft-deleting attachment:', err);
      alert(`Failed to remove attachment: ${err.message}`);
    }
  };

  const handleDownloadFile = async (fileEntry) => {
    try {
        let bucketName = '';
        // Infer bucket from mime_type as a primary strategy
        if (fileEntry.mime_type?.startsWith('image/')) {
            bucketName = 'task-images';
        } else { // Default to task-documents for other types or if mime_type is missing
            bucketName = 'task-documents';
        }

        // The storage_path from DB should be the path within the bucket
        // e.g., "user_id/task_id/filename.ext"
        const actualStoragePath = fileEntry.storage_path;

        const { data, error } = await supabase.storage.from(bucketName).createSignedUrl(actualStoragePath, 300); // 5 minutes validity
        if (error) throw error;

        const link = document.createElement('a');
        link.href = data.signedUrl;
        link.target = '_blank';
        link.download = fileEntry.file_name; // Suggest original filename for download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (err) {
        console.error('Error creating signed URL for download:', err);
        alert(`Could not download file: ${err.message}`);
    }
  };


  if (!isOpen) return null;

  return (
    <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1" role="dialog">
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Task Details</h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            {loading && <p>Loading task details...</p>}
            {error && <div className="alert alert-danger">{error}</div>}
            {!loading && !error && taskDetails && (
              <>
                <h4>{taskDetails.task_title || taskDetails.title}</h4>
                <hr />
                <dl className="row">
                  <dt className="col-sm-3">Property</dt>
                  <dd className="col-sm-9">{taskDetails.property_address_street || 'N/A'}{taskDetails.property_address_city ? `, ${taskDetails.property_address_city}` : ''}</dd>

                  <dt className="col-sm-3">Status</dt>
                  <dd className="col-sm-9"><span className={`badge rounded-pill badge-custom-${taskDetails.task_status?.toLowerCase().replace(/\s+/g,'-') || 'secondary'}`}>{taskDetails.task_status || 'N/A'}</span></dd>

                  <dt className="col-sm-3">Priority</dt>
                  <dd className="col-sm-9">{taskDetails.task_priority || 'N/A'}</dd>

                  <dt className="col-sm-3">Due Date</dt>
                  <dd className="col-sm-9">{taskDetails.task_due_date ? new Date(taskDetails.task_due_date).toLocaleDateString() : 'N/A'}</dd>

                  <dt className="col-sm-3">Assigned To</dt>
                  <dd className="col-sm-9">{taskDetails.assignee_full_name || taskDetails.assignee_email || 'Unassigned'}</dd>

                  <dt className="col-sm-3">Description</dt>
                  <dd className="col-sm-9"><p style={{whiteSpace: "pre-wrap"}}>{taskDetails.task_description || taskDetails.description || 'No description.'}</p></dd>

                  <dt className="col-sm-3">Notes</dt>
                  <dd className="col-sm-9"><p style={{whiteSpace: "pre-wrap"}}>{taskDetails.task_notes || 'No notes.'}</p></dd>
                </dl>

                <hr />
                <h6>Attachments</h6>
                {files.length > 0 ? (
                  <ul className="list-group list-group-flush">
                    {files.map(file => (
                      <li key={file.id} className="list-group-item d-flex justify-content-between align-items-center">
                        <span>
                          <i className={`bi bi-file-earmark${file.mime_type?.startsWith('image/') ? '-image' : (file.mime_type === 'application/pdf' ? '-pdf' : '')} me-2`}></i>
                          <a href="#" onClick={(e) => { e.preventDefault(); handleDownloadFile(file); }} title="Download file">
                            {file.file_name}
                          </a>
                          <small className="text-muted ms-2">({(file.file_size / 1024).toFixed(1)} KB)</small>
                        </span>
                        {(isAdmin || user?.id === file.uploaded_by) && // Allow uploader or admin to delete
                          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleSoftDeleteAttachment(file.id)}>
                            <i className="bi bi-trash"></i>
                          </button>
                        }
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No attachments for this task.</p>
                )}
              </>
            )}
            {!loading && !error && !taskDetails && <p>No task selected or details unavailable.</p>}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
            {/* Optionally, an Edit button here could open the CreateEditTaskModal */}
            {/* {isAdmin && <button type="button" className="btn btn-primary" onClick={() => onEditTask(taskDetails)}>Edit Task</button>} */}
          </div>
        </div>
      </div>
      {isOpen && <div className="modal-backdrop fade show"></div>}
    </div>
  );
};

export default ViewTaskModal;
