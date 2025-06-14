import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';

// SVG Icon Components (assuming these might be shared or are defined similarly to CreateEditTaskModal)
const IconX = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const IconDownload = ({ className = "w-4 h-4" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
  </svg>
);

const IconTrash = ({ className = "w-4 h-4" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12.56 0c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
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

const IconPdfFile = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    <text x="50%" y="65%" dominantBaseline="middle" textAnchor="middle" fontSize="8px" fontWeight="bold" fill="currentColor">PDF</text>
  </svg>
);

// Badge styling helpers (can be moved to a shared utility)
const getStatusBadgeClasses = (status) => {
  let baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
  switch (status?.toLowerCase()) {
    case 'new': return `${baseClasses} bg-blue-100 text-blue-800`;
    case 'in progress': return `${baseClasses} bg-amber-100 text-amber-800`;
    case 'blocked': return `${baseClasses} bg-red-100 text-red-800`;
    case 'completed': return `${baseClasses} bg-green-100 text-green-800`;
    case 'cancelled': return `${baseClasses} bg-slate-100 text-slate-800`;
    default: return `${baseClasses} bg-gray-100 text-gray-800`;
  }
};

const getPriorityBadgeClasses = (priority) => { // Added for consistency, though not directly in original View modal
  let baseClasses = "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold";
  switch (priority?.toLowerCase()) {
    case 'low': return `${baseClasses} bg-sky-100 text-sky-700`;
    case 'medium': return `${baseClasses} bg-yellow-100 text-yellow-700`;
    case 'high': return `${baseClasses} bg-orange-100 text-orange-700`;
    case 'urgent': return `${baseClasses} bg-pink-100 text-pink-700`;
    default: return `${baseClasses} bg-gray-100 text-gray-700`;
  }
};


const ViewTaskModal = ({ isOpen, onClose, task, onAttachmentDeleted, onTaskUpdated }) => {
  const { user, isAdmin } = useAuth();
  const modalRef = useRef(null);
  const [taskDetails, setTaskDetails] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [animationClass, setAnimationClass] = useState('opacity-0 scale-95');

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
      // Delay applying 'enter' animation classes
      requestAnimationFrame(() => {
        setAnimationClass('opacity-100 scale-100');
      });
    } else {
      setAnimationClass('opacity-0 scale-95');
      // Clear details when modal is starting to close
      // setTaskDetails(null); // This might clear data too soon if animation is slow
      // setFiles([]);
      // setError(null);
    }
  }, [isOpen, fetchFullTaskDetails]);

  // Effect to clear data after close animation completes
  useEffect(() => {
    if (!isOpen && animationClass === 'opacity-0 scale-95') {
      const timer = setTimeout(() => {
        setTaskDetails(null);
        setFiles([]);
        setError(null);
      }, 300); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [isOpen, animationClass]);


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

  const handleBackdropClick = (e) => {
    if (modalRef.current && e.target === modalRef.current) {
      return; // Static backdrop: do nothing on backdrop click
    }
  };

  if (!isOpen && animationClass === 'opacity-0 scale-95') {
    return null;
  }

  return (
    <div
      ref={modalRef}
      onClick={handleBackdropClick}
      className={`fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      aria-labelledby="view-task-modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[95vh] transform transition-all duration-300 ease-in-out ${animationClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center p-5 border-b border-slate-200">
          <h3 id="view-task-modal-title" className="text-xl font-semibold text-slate-800">
            Task Details
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
            aria-label="Close modal"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-grow p-6 overflow-y-auto space-y-5"> {/* Main body padding and spacing */}
          {loading && <p className="p-4 text-center text-slate-600">Loading task details...</p>}
          {error && <div className="p-4 text-sm text-red-700 bg-red-100 border border-red-200 rounded-lg">{error}</div>}

          {!loading && !error && taskDetails && (
            <>
              <div>
                <h4 className="text-2xl font-semibold text-slate-900 mb-3">{taskDetails.task_title || taskDetails.title}</h4>
                <dl className="space-y-3 text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-x-4 gap-y-1">
                    <dt className="sm:col-span-1 font-medium text-slate-500">Property</dt>
                    <dd className="sm:col-span-3 text-slate-700">{taskDetails.address || 'N/A'}</dd>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-x-4 gap-y-1">
                    <dt className="sm:col-span-1 font-medium text-slate-500">Status</dt>
                    <dd className="sm:col-span-3"><span className={getStatusBadgeClasses(taskDetails.task_status)}>{taskDetails.task_status || 'N/A'}</span></dd>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-x-4 gap-y-1">
                    <dt className="sm:col-span-1 font-medium text-slate-500">Priority</dt>
                    <dd className="sm:col-span-3"><span className={getPriorityBadgeClasses(taskDetails.task_priority)}>{taskDetails.task_priority || 'N/A'}</span></dd>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-x-4 gap-y-1">
                    <dt className="sm:col-span-1 font-medium text-slate-500">Due Date</dt>
                    <dd className="sm:col-span-3 text-slate-700">{taskDetails.task_due_date ? new Date(taskDetails.task_due_date).toLocaleDateString() : 'N/A'}</dd>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-x-4 gap-y-1">
                    <dt className="sm:col-span-1 font-medium text-slate-500">Assigned To</dt>
                    <dd className="sm:col-span-3 text-slate-700">{(taskDetails.assignee_first_name && taskDetails.assignee_last_name ? `${taskDetails.assignee_first_name} ${taskDetails.assignee_last_name}` : taskDetails.assignee_email) || <span className="italic text-slate-500">Unassigned</span>}</dd>
                  </div>
                  <div> {/* Full width for description and notes */}
                    <dt className="text-sm font-medium text-slate-500 mb-0.5">Description</dt>
                    <dd className="text-sm text-slate-700 whitespace-pre-wrap break-words bg-slate-50/80 p-3 rounded-md border border-slate-200/80 min-h-[4em]">{taskDetails.task_description || taskDetails.description || <span className="italic text-slate-500">No description.</span>}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-slate-500 mb-0.5">Notes</dt>
                    <dd className="text-sm text-slate-700 whitespace-pre-wrap break-words bg-slate-50/80 p-3 rounded-md border border-slate-200/80 min-h-[4em]">{taskDetails.task_notes || <span className="italic text-slate-500">No notes.</span>}</dd>
                  </div>
                </dl>
              </div>

              <hr className="my-5 border-slate-200" />

              <div>
                <h4 className="text-md font-semibold text-slate-800 mb-3">Attachments</h4>
                {files.length > 0 ? (
                  <ul className="space-y-2.5">
                    {files.map(file => (
                      <li key={file.id} className="flex items-center justify-between py-2.5 px-3.5 border border-slate-200/90 rounded-lg bg-slate-50/60 hover:bg-slate-100/70 transition-colors duration-150">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {file.mime_type?.startsWith('image/') ? <IconImageFile className="w-5 h-5 text-slate-500 flex-shrink-0" /> :
                           (file.mime_type === 'application/pdf' ? <IconPdfFile className="w-5 h-5 text-slate-500 flex-shrink-0" /> : <IconFileGeneric className="w-5 h-5 text-slate-500 flex-shrink-0" />)}
                          <a
                            href="#"
                            onClick={(e) => { e.preventDefault(); handleDownloadFile(file); }}
                            title={`Download ${file.file_name}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline truncate flex-grow"
                          >
                            {file.file_name}
                          </a>
                          <span className="text-xs text-slate-500 whitespace-nowrap flex-shrink-0">({(file.file_size / 1024).toFixed(1)} KB)</span>
                        </div>
                        {(isAdmin || user?.id === file.uploaded_by) &&
                          <button
                            type="button"
                            onClick={() => handleSoftDeleteAttachment(file.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors ml-2 flex-shrink-0"
                            aria-label="Remove attachment"
                          >
                            <IconTrash className="w-4 h-4" />
                          </button>
                        }
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500 italic py-2">No attachments for this task.</p>
                )}
              </div>
            </>
          )}
          {!loading && !error && !taskDetails && isOpen && (
            <p className="p-4 text-center text-slate-500">No task selected or details unavailable.</p>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end items-center gap-3 p-5 bg-slate-50/70 border-t border-slate-200 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ViewTaskModal;
