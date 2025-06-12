import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import CreateEditTaskModal from '../components/modals/CreateEditTaskModal';
import ViewTaskModal from '../components/modals/ViewTaskModal'; // Import ViewTaskModal

const ITEMS_PER_PAGE = 10;

const TasksPage = () => {
  const { isAdmin, user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const [isCreateEditModalOpen, setIsCreateEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false); // State for ViewModal
  const [selectedTask, setSelectedTask] = useState(null); // For both editing and viewing

  const [propertiesList, setPropertiesList] = useState([]);
  const [staffList, setStaffList] = useState([]);

  const statusOptions = ['New', 'In Progress', 'Blocked', 'Completed', 'Cancelled'];
  const priorityOptions = ['Low', 'Medium', 'High', 'Urgent'];

  const fetchPropertiesForModal = useCallback(async () => {
    if (!user?.app_metadata?.company_id) { setPropertiesList([]); return; }
    try { const { data, error: dbError } = await supabase.from('properties').select('id, name, address_street').eq('company_id', user.app_metadata.company_id).order('name'); if (dbError) throw dbError; setPropertiesList(data || []); } catch (err) { console.error('Error fetching properties list:', err); setPropertiesList([]); }
  }, [user]);

  const fetchStaffForModal = useCallback(async () => {
    if (!user?.app_metadata?.company_id) { setStaffList([]); return; }
    try { const { data, error: dbError } = await supabase.from('profiles').select('id, full_name, email').eq('company_id', user.app_metadata.company_id).neq('is_admin', true).order('full_name'); if (dbError) throw dbError; setStaffList(data || []); } catch (err) { console.error('Error fetching staff list:', err); setStaffList([]); }
  }, [user]);

  const fetchTasks = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const from = (page - 1) * ITEMS_PER_PAGE; const to = from + ITEMS_PER_PAGE - 1;
      // Ensure all fields needed by ViewTaskModal and CreateEditTaskModal are selected
      // The `detailed_task_assignments` view should ideally contain all these.
      // Adding task_notes, task_description explicitly if they might not be in `*` from a minimal view.
      let query = supabase.from('detailed_task_assignments')
        .select('*, task_notes, task_description', { count: 'exact' })
        .order('task_due_date', { ascending: true, nullsFirst: false }).range(from, to);
      if (statusFilter) query = query.eq('task_status', statusFilter);
      if (priorityFilter) query = query.eq('task_priority', priorityFilter);
      const { data, error: dbError, count } = await query; if (dbError) throw dbError;
      setTasks(data || []); setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));
    } catch (err) { console.error('Error fetching tasks:', err); setError(err.message); setTasks([]); }
    finally { setLoading(false); }
  }, [page, statusFilter, priorityFilter]);

  useEffect(() => {
    fetchTasks();
    if (isAdmin) { fetchPropertiesForModal(); fetchStaffForModal(); }
  }, [fetchTasks, isAdmin, fetchPropertiesForModal, fetchStaffForModal]);

  const handleOpenCreateModal = () => { setSelectedTask(null); setIsCreateEditModalOpen(true); };
  const handleOpenEditModal = (taskToEdit) => { setSelectedTask(taskToEdit); setIsCreateEditModalOpen(true); };
  const handleOpenViewModal = (taskToView) => { setSelectedTask(taskToView); setIsViewModalOpen(true); };

  const handleModalSave = () => { setIsCreateEditModalOpen(false); fetchTasks(); };
  const handleViewModalClose = () => { setIsViewModalOpen(false); setSelectedTask(null); };

  // This function is called when an attachment is deleted from ViewTaskModal
  // It can simply refetch tasks, or more optimally, update the specific task in the list.
  const handleAttachmentUpdateInView = () => {
    fetchTasks(); // Re-fetch all tasks to ensure consistency
  };


  const handleDeleteTask = async (taskId) => {
    if (!isAdmin) { alert("You don't have permission."); return; }
    if (window.confirm('Are you sure you want to delete this task? This will also remove its assignments and mark its files as deleted.')) {
        setLoading(true);
        try {
            const { error: delAssignError } = await supabase.from('task_assignments').delete().eq('task_id', taskId);
            if(delAssignError) console.warn("Error deleting task assignments", delAssignError.message); // Log but continue

            const { error: delFilesError } = await supabase.from('task_files').update({is_deleted: true}).eq('task_id', taskId);
            if(delFilesError) console.warn("Error soft-deleting task files", delFilesError.message); // Log but continue

            const { error: deleteTaskError } = await supabase.from('tasks').delete().eq('task_id', taskId);
            if (deleteTaskError) throw deleteTaskError;

            if (tasks.length === 1 && page > 1) setPage(page - 1);
            else fetchTasks();
        } catch (err) {
            setError(err.message); console.error("Error deleting task:", err);
        } finally {
            setLoading(false);
        }
    }
  };

  if (loading && tasks.length === 0) return <p className="container mt-4">Loading tasks...</p>;
  if (error && tasks.length === 0) return <p className="container mt-4 text-danger">Error fetching tasks: {error}</p>;

  return (
    <div className="container-fluid pt-3">
      {/* Header and Filters (same as before) */}
      <div className="d-flex justify-content-between align-items-center pb-2 mb-3 border-bottom"><h1 className="h2">Tasks</h1>{isAdmin && (<button type="button" className="btn btn-primary" onClick={handleOpenCreateModal}><i className="bi bi-plus-lg me-1"></i> Create New Task</button>)}</div>
      <div className="row mb-3 gx-2"><div className="col-md-3"><select className="form-select" value={statusFilter} onChange={(e) => {setStatusFilter(e.target.value); setPage(1);}}><option value="">All Statuses</option>{statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div><div className="col-md-3"><select className="form-select" value={priorityFilter} onChange={(e) => {setPriorityFilter(e.target.value); setPage(1);}}><option value="">All Priorities</option>{priorityOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select></div></div>
      {error && <div className="alert alert-danger mt-2">Error: {error}</div>}
      {loading && <p>Loading tasks...</p>}

      {!loading && tasks.length === 0 ? (<p>No tasks found.</p>) : (
        <div className="table-responsive"><table className="table table-hover">
            <thead className="table-light"><tr><th>Property</th><th>Title</th><th>Status</th><th>Priority</th><th>Due Date</th><th>Assigned To</th><th>Actions</th></tr></thead>
            <tbody>{tasks.map(task => (
                <tr key={task.task_id}>
                  <td>{task.property_address_street || 'N/A'}{task.property_address_city ? `, ${task.property_address_city}` : ''}</td>
                  <td>{task.task_title}</td>
                  <td><span className={`badge rounded-pill badge-custom-${task.task_status?.toLowerCase().replace(/\s+/g,'-') || 'secondary'}`}>{task.task_status || 'N/A'}</span></td>
                  <td>{task.task_priority || 'N/A'}</td>
                  <td>{task.task_due_date ? new Date(task.task_due_date).toLocaleDateString() : 'N/A'}</td>
                  <td>{task.assignee_full_name || task.assignee_email || 'Unassigned'}</td>
                  <td>
                    <button className="btn btn-sm btn-outline-primary me-1" onClick={() => handleOpenViewModal(task)}><i className="bi bi-eye"></i></button>
                    {isAdmin && (<>
                        <button className="btn btn-sm btn-outline-secondary me-1" onClick={() => handleOpenEditModal(task)}><i className="bi bi-pencil"></i></button>
                        <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteTask(task.task_id)}><i className="bi bi-trash"></i></button></>)}
                  </td></tr>))}</tbody>
        </table></div>)}
      {/* Pagination (simplified for brevity in this script, assume it's the same as before) */}
      {totalPages > 1 && ( <nav className="mt-4"><ul className="pagination justify-content-center"><li className={`page-item ${page === 1 ? 'disabled' : ''}`}><button className="page-link" onClick={() => setPage(p => p - 1)} disabled={page === 1}>Previous</button></li>{[...Array(totalPages).keys()].map(num => ( <li key={num + 1} className={`page-item ${page === num + 1 ? 'active' : ''}`}><button className="page-link" onClick={() => setPage(num + 1)}>{num + 1}</button></li>))}<li className={`page-item ${page === totalPages ? 'disabled' : ''}`}><button className="page-link" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>Next</button></li></ul></nav> )}

      {isCreateEditModalOpen && isAdmin && ( <CreateEditTaskModal isOpen={isCreateEditModalOpen} onClose={() => setIsCreateEditModalOpen(false)} task={selectedTask} onSave={handleModalSave} propertiesList={propertiesList} staffList={staffList} />)}
      {isViewModalOpen && ( <ViewTaskModal isOpen={isViewModalOpen} onClose={handleViewModalClose} task={selectedTask} onAttachmentDeleted={handleAttachmentUpdateInView} /> )}
    </div>);};
export default TasksPage;
