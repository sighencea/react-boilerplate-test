import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import CreateEditTaskModal from '../components/modals/CreateEditTaskModal';
import ViewTaskModal from '../components/modals/ViewTaskModal';
import TaskActionsDropdown from '../components/utils/TaskActionsDropdown'; // Import path corrected

const ITEMS_PER_PAGE = 10;

// SVG Icon Components are now removed as they are encapsulated in TaskActionsDropdown or not used.

// Helper for badge styling
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

const getPriorityBadgeClasses = (priority) => {
  let baseClasses = "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold"; // Slightly different style for priority
  switch (priority?.toLowerCase()) {
    case 'low': return `${baseClasses} bg-sky-100 text-sky-700`;
    case 'medium': return `${baseClasses} bg-yellow-100 text-yellow-700`;
    case 'high': return `${baseClasses} bg-orange-100 text-orange-700`;
    case 'urgent': return `${baseClasses} bg-pink-100 text-pink-700`;
    default: return `${baseClasses} bg-gray-100 text-gray-700`;
  }
};


const TasksPage = () => {
  const { isAdmin, user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState(''); // Added for search functionality

  const [isCreateEditModalOpen, setIsCreateEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false); // State for ViewModal
  const [selectedTask, setSelectedTask] = useState(null); // For both editing and viewing

  const [propertiesList, setPropertiesList] = useState([]);
  const [staffList, setStaffList] = useState([]);

  const statusOptions = ['New', 'In Progress', 'Blocked', 'Completed', 'Cancelled'];
  const priorityOptions = ['Low', 'Medium', 'High', 'Urgent'];

  const fetchPropertiesForModal = useCallback(async () => {
    if (!user?.app_metadata?.company_id) { setPropertiesList([]); return; }
    try { const { data, error: dbError } = await supabase.from('properties').select('id, property_name, address').eq('company_id', user.app_metadata.company_id).order('property_name', { ascending: true }); if (dbError) throw dbError; setPropertiesList(data || []); } catch (err) { console.error('Error fetching properties list:', err); setPropertiesList([]); }
  }, [user]);

  const fetchStaffForModal = useCallback(async () => {
    if (!user?.app_metadata?.company_id) { setStaffList([]); return; }
    try { const { data, error: dbError } = await supabase.from('profiles').select('id, first_name, last_name, email').eq('company_id', user.app_metadata.company_id).neq('is_admin', true).order('first_name', { ascending: true }).order('last_name', { ascending: true }); if (dbError) throw dbError; setStaffList(data || []); } catch (err) { console.error('Error fetching staff list:', err); setStaffList([]); }
  }, [user]);

  const fetchTasks = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const from = (page - 1) * ITEMS_PER_PAGE; const to = from + ITEMS_PER_PAGE - 1;
      let query = supabase.from('detailed_task_assignments')
        .select('*', { count: 'exact' })
        .order('task_due_date', { ascending: true, nullsLast: true });

      // Apply filters
      if (statusFilter) query = query.eq('task_status', statusFilter);
      if (priorityFilter) query = query.eq('task_priority', priorityFilter);
      if (searchQuery) {
        // Assuming task_title, property_address (if joined), or assignee_name (if joined) are searchable
        // This example searches task_title. Adjust based on your 'detailed_task_assignments' view structure.
        query = query.ilike('task_title', `%${searchQuery}%`);
      }

      query = query.range(from, to); // Apply range after all filters

      const { data, error: dbError, count } = await query; if (dbError) throw dbError;
      setTasks(data || []); setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));
    } catch (err) { console.error('Error fetching tasks:', err); setError(err.message); setTasks([]); }
    finally { setLoading(false); }
  }, [page, statusFilter, priorityFilter, searchQuery]); // Added searchQuery to dependencies

  useEffect(() => {
    fetchTasks();
    if (isAdmin) { fetchPropertiesForModal(); fetchStaffForModal(); }
  }, [fetchTasks, isAdmin, fetchPropertiesForModal, fetchStaffForModal]);

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
    setPage(1); // Reset to first page on new search
  };

  const handleOpenCreateModal = () => {
    console.log('handleOpenCreateModal called');
    setSelectedTask(null);
    setIsCreateEditModalOpen(true);
    console.log('isCreateEditModalOpen set to true for create');
  };
  const handleOpenEditModal = (taskToEdit) => {
    console.log('handleOpenEditModal called with task:', taskToEdit);
    setSelectedTask(taskToEdit);
    setIsCreateEditModalOpen(true);
    console.log('isCreateEditModalOpen set to true for edit');
  };
  const handleOpenViewModal = (taskToView) => {
    console.log('handleOpenViewModal called with task:', taskToView);
    setSelectedTask(taskToView);
    setIsViewModalOpen(true);
    console.log('isViewModalOpen set to true');
  };

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

  // Initial loading and error states (before main content section is decided)
  if (loading && tasks.length === 0 && !searchQuery && !statusFilter && !priorityFilter) return <p className="px-6 py-4 text-slate-700">Loading tasks...</p>;
  if (error && tasks.length === 0 && !searchQuery && !statusFilter && !priorityFilter) return <p className="px-6 py-4 text-red-600">Error fetching tasks: {error}</p>;

  return (
    <>
      <header className="sticky top-6 z-40 mx-6 mb-8">
        <div className="backdrop-blur-xl bg-white/80 border border-white/20 rounded-2xl shadow-xl shadow-black/5 p-6">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              {/* Search Bar */}
              <div className="flex items-center flex-1 max-w-md border border-slate-200 rounded-md bg-white/60 shadow-xs h-9 transition-colors focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/50">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-search w-4 h-4 text-slate-400 mx-2 flex-shrink-0"
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.3-4.3"></path>
                </svg>
                <input
                  type="text"
                  className="h-full flex-1 min-w-0 bg-transparent px-2 py-1 text-base md:text-sm placeholder:text-muted-foreground focus:outline-none disabled:pointer-events-none disabled:cursor-not-allowed file:text-foreground selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:text-sm file:font-medium"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  // disabled // Enable when search functionality is fully implemented
                />
              </div>
              {/* Filters */}
              <div className="flex gap-2">
                <div className="relative"> {/* Wrapper for select styling if needed */}
                  <select
                    value={statusFilter}
                    onChange={(e) => {setStatusFilter(e.target.value); setPage(1);}}
                    className="appearance-none inline-flex items-center justify-center whitespace-nowrap rounded-xl border border-slate-200 bg-white/60 px-3 py-2 text-sm font-medium text-slate-700 ring-offset-background transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-9 min-w-[120px] pr-8" // Added h-9, min-w, pr-8 for arrow space
                  >
                    <option value="">All Statuses</option>
                    {statusOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-down absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none"><path d="m6 9 6 6 6-6"></path></svg>
                </div>
                <div className="relative">
                  <select
                    value={priorityFilter}
                    onChange={(e) => {setPriorityFilter(e.target.value); setPage(1);}}
                    className="appearance-none inline-flex items-center justify-center whitespace-nowrap rounded-xl border border-slate-200 bg-white/60 px-3 py-2 text-sm font-medium text-slate-700 ring-offset-background transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-9 min-w-[120px] pr-8"
                  >
                    <option value="">All Priorities</option>
                    {priorityOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-down absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none"><path d="m6 9 6 6 6-6"></path></svg>
                </div>
              </div>
            </div>
            {isAdmin && (
              <button
                onClick={handleOpenCreateModal}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white ring-offset-background transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 shadow-lg shadow-blue-500/20 gap-1.5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus w-4 h-4"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>
                Create New Task
              </button>
            )}
          </div>
        </div>
      </header>

      <section className="px-6 pb-12">
        {/* Error display within the content section */}
        {error && !loading && tasks.length > 0 && <div className="my-2 p-3 bg-red-100 text-red-700 border border-red-200 rounded-md">Error fetching tasks: {error}</div>}

        {/* Loading state when tasks might already be partially loaded (e.g., during filter change or pagination) */}
        {loading && <p className="py-4 text-slate-700 text-center">Loading tasks...</p>}

        {!loading && tasks.length === 0 ? (
          <div className="text-center py-10 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-slate-800">No Tasks Found</h3>
            <p className="mt-1 text-sm text-slate-500">No tasks match your current filters or search query.</p>
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border-0">
            <table className="min-w-full text-sm text-left">
              <thead className="text-xs text-slate-700 uppercase bg-slate-50/70">
                <tr>
                  <th scope="col" className="px-6 py-3 font-medium">Property</th>
                  <th scope="col" className="px-6 py-3 font-medium">Title</th>
                  <th scope="col" className="px-6 py-3 font-medium">Status</th>
                  <th scope="col" className="px-6 py-3 font-medium">Priority</th>
                  <th scope="col" className="px-6 py-3 font-medium">Due Date</th>
                  <th scope="col" className="px-6 py-3 font-medium">Assigned To</th>
                  <th scope="col" className="px-6 py-3 font-medium text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task, index) => (
                  <tr key={task.task_id} className={`bg-white/90 hover:bg-slate-50/90 transition-colors duration-150 ${index === tasks.length - 1 ? '' : 'border-b border-slate-200/80'}`}>
                    <td className="px-6 py-4 text-slate-700 whitespace-nowrap">{task.address || 'N/A'}</td>
                    <td className="px-6 py-4 font-medium text-slate-900 whitespace-normal max-w-xs">{task.task_title}</td>
                    <td className="px-6 py-4"><span className={getStatusBadgeClasses(task.task_status)}>{task.task_status || 'N/A'}</span></td>
                    <td className="px-6 py-4"><span className={getPriorityBadgeClasses(task.task_priority)}>{task.task_priority || 'N/A'}</span></td>
                    <td className="px-6 py-4 text-slate-700 whitespace-nowrap">{task.task_due_date ? new Date(task.task_due_date).toLocaleDateString() : 'N/A'}</td>
                    <td className="px-6 py-4 text-slate-700 whitespace-nowrap">{(task.assignee_first_name && task.assignee_last_name ? `${task.assignee_first_name} ${task.assignee_last_name}` : task.assignee_email) || <span className="text-slate-500 italic">Unassigned</span>}</td>
                    <td className="px-6 py-4 text-center"> {/* Adjusted to text-center for better dropdown alignment if needed, or text-right */}
                      <TaskActionsDropdown
                        task={task}
                        isAdmin={isAdmin}
                        onView={handleOpenViewModal}
                        onEdit={handleOpenEditModal}
                        onDelete={handleDeleteTask}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <nav className="flex items-center justify-center space-x-1 mt-8" aria-label="Pagination">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className={`px-3 py-1.5 mx-1 text-sm font-medium rounded-md transition-colors ${page === 1 ? 'text-slate-400 cursor-not-allowed bg-slate-100/80' : 'text-slate-700 hover:bg-slate-100/90 active:bg-slate-200/90'}`}
            >
              Previous
            </button>
            {[...Array(totalPages).keys()].map(num => {
              const pageNumber = num + 1;
              const isActive = page === pageNumber;
              // Basic pagination logic: show first, last, current, and 2 neighbors
              // More complex logic might be needed for many pages
              if (
                pageNumber === 1 ||
                pageNumber === totalPages ||
                (pageNumber >= page - 1 && pageNumber <= page + 1) // Show 1 neighbor for simplicity here
              ) {
                return (
                  <button
                    key={pageNumber}
                    onClick={() => setPage(pageNumber)}
                    className={`px-3 py-1.5 mx-1 text-sm font-medium rounded-md transition-colors ${isActive ? 'bg-blue-600 text-white shadow-md' : 'text-slate-700 hover:bg-slate-100/90 active:bg-slate-200/90'}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {pageNumber}
                  </button>
                );
              } else if (
                  (pageNumber === page - 2 && page > 3) ||
                  (pageNumber === page + 2 && page < totalPages - 2)
              ) {
                  return <span key={pageNumber} className="px-3 py-1.5 mx-1 text-sm font-medium text-slate-500">...</span>;
              }
              return null;
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className={`px-3 py-1.5 mx-1 text-sm font-medium rounded-md transition-colors ${page === totalPages ? 'text-slate-400 cursor-not-allowed bg-slate-100/80' : 'text-slate-700 hover:bg-slate-100/90 active:bg-slate-200/90'}`}
            >
              Next
            </button>
          </nav>
        )}
      </section>

      {/* Modals - Kept outside the main section for absolute positioning usually */}
      {isCreateEditModalOpen && isAdmin && (
        <CreateEditTaskModal
          isOpen={isCreateEditModalOpen}
          onClose={() => setIsCreateEditModalOpen(false)}
          task={selectedTask}
          onSave={handleModalSave}
          propertiesList={propertiesList}
          staffList={staffList}
        />
      )}
      {isViewModalOpen && (
        <ViewTaskModal
          isOpen={isViewModalOpen}
          onClose={handleViewModalClose}
          task={selectedTask}
          onAttachmentDeleted={handleAttachmentUpdateInView}
        />
      )}
    </>
  );
};
export default TasksPage;
