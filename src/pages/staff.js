import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import InviteStaffModal from '../components/modals/InviteStaffModal';
import EditStaffModal from '../components/modals/EditStaffModal';
import StaffActionsDropdown from '../components/utils/StaffActionsDropdown'; // Import the new dropdown

const ITEMS_PER_PAGE = 10;

// Helper for status badge styling
const getStaffStatusBadgeClasses = (status) => {
  let baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
  switch (status?.toLowerCase()) {
    case 'active': return `${baseClasses} bg-green-100 text-green-800`;
    case 'invited': return `${baseClasses} bg-amber-100 text-amber-800`;
    case 'new': return `${baseClasses} bg-sky-100 text-sky-800`; // Using sky for 'New' to differentiate from 'Invited'
    case 'inactive': return `${baseClasses} bg-slate-100 text-slate-800`;
    case 'locked': return `${baseClasses} bg-red-100 text-red-800`;
    default: return `${baseClasses} bg-gray-100 text-gray-800`;
  }
};

const StaffPage = () => {
  const { user, isAdmin } = useAuth();
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStaffMember, setEditingStaffMember] = useState(null);

  const roleOptions = ['Electrician', 'Plumber', 'Cleaner', 'Contractor', 'Other']; // Keep consistent
  const statusOptions = ['Active', 'Invited', 'New', 'Inactive', 'Locked']; // Possible user_status values

  const fetchStaff = useCallback(async () => {
    if (!user?.app_metadata?.company_id) { setLoading(false); setError("User company information is not available."); setStaffList([]); return; }
    setLoading(true); setError(null);
    try {
      const from = (page - 1) * ITEMS_PER_PAGE; const to = from + ITEMS_PER_PAGE - 1;
      let query = supabase.from('profiles')
        .select('id, first_name, last_name, email, user_role, user_status, avatar_url, created_at', { count: 'exact' })
        .eq('company_id', user.app_metadata.company_id).eq('is_admin', false)
        .order('first_name', { ascending: true }).order('last_name', { ascending: true });
      if (searchQuery) query = query.or(`first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      if (roleFilter) query = query.eq('user_role', roleFilter); // Changed 'role' to 'user_role'
      if (statusFilter) query = query.eq('user_status', statusFilter);
      query = query.range(from, to);
      const { data, error: dbError, count } = await query; if (dbError) throw dbError;
      setStaffList(data || []); setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));
    } catch (err) { console.error('Error fetching staff:', err); setError(err.message); setStaffList([]); }
    finally { setLoading(false); }
  }, [user, page, searchQuery, roleFilter, statusFilter]);

  useEffect(() => {
    if (isAdmin) fetchStaff();
    else { setLoading(false); setError("Access Denied."); setStaffList([]); }
  }, [isAdmin, fetchStaff]);

  const handleSearchChange = (e) => { setSearchQuery(e.target.value); setPage(1); };
  const handleRoleFilterChange = (e) => { setRoleFilter(e.target.value); setPage(1); };
  const handleStatusFilterChange = (e) => { setStatusFilter(e.target.value); setPage(1); };

  const handleOpenInviteModal = () => setIsInviteModalOpen(true);
  const handleStaffInvited = () => { setIsInviteModalOpen(false); fetchStaff(); };

  const handleOpenEditModal = (staffMember) => { setEditingStaffMember(staffMember); setIsEditModalOpen(true); };
  const handleStaffUpdated = () => { setIsEditModalOpen(false); setEditingStaffMember(null); fetchStaff(); };

  const handleDeleteStaff = async (staffMember) => { // Now takes full staffMember object
    if (!isAdmin) { alert("Permission denied."); return; }
    // For now, make it a status update to 'Inactive'
    const fullNameDisplay = `${staffMember.first_name || ''} ${staffMember.last_name || ''}`.trim();
    const confirmDeactivate = window.confirm(`Are you sure you want to set staff member ${fullNameDisplay || staffMember.email} to 'Inactive'?`);
    if (confirmDeactivate) {
        setLoading(true);
        try {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ user_status: 'Inactive' })
                .eq('id', staffMember.id);
            if (updateError) throw updateError;
            fetchStaff(); // Refresh list
        } catch (err) {
            console.error('Error deactivating staff:', err);
            setError(err.message || "Failed to deactivate staff.");
        } finally {
            setLoading(false);
        }
    }
  };


  if (!isAdmin && !loading) return <div className="container mt-4 alert alert-danger" role="alert">{error || "Access Denied."}</div>;
  if (loading && staffList.length === 0 && !searchQuery && !roleFilter && !statusFilter) return <p className="px-6 py-4 text-slate-700">Loading staff members...</p>;
  if (error && staffList.length === 0 && !loading && !searchQuery && !roleFilter && !statusFilter) return <p className="px-6 py-4 text-red-600">Error fetching staff: {error}</p>;
  if (!isAdmin && !loading) return <div className="px-6 py-4 text-red-600">Access Denied.</div>;


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
                  className="h-full flex-1 min-w-0 bg-transparent px-2 py-1 text-base md:text-sm placeholder:text-muted-foreground focus:outline-none"
                  placeholder="Search staff..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                />
              </div>
              {/* Filters */}
              <div className="flex gap-2">
                <div className="relative">
                  <select
                    value={roleFilter}
                    onChange={handleRoleFilterChange}
                    className="appearance-none inline-flex items-center justify-center whitespace-nowrap rounded-xl border border-slate-200 bg-white/60 px-3 py-2 text-sm font-medium text-slate-700 ring-offset-background transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 h-9 min-w-[120px] pr-8"
                  >
                    <option value="">All Roles</option>
                    {roleOptions.map(role => <option key={role} value={role}>{role}</option>)}
                  </select>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-down absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none"><path d="m6 9 6 6 6-6"></path></svg>
                </div>
                <div className="relative">
                  <select
                    value={statusFilter}
                    onChange={handleStatusFilterChange}
                    className="appearance-none inline-flex items-center justify-center whitespace-nowrap rounded-xl border border-slate-200 bg-white/60 px-3 py-2 text-sm font-medium text-slate-700 ring-offset-background transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 h-9 min-w-[120px] pr-8"
                  >
                    <option value="">All Statuses</option>
                    {statusOptions.map(status => <option key={status} value={status}>{status}</option>)}
                  </select>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-down absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none"><path d="m6 9 6 6 6-6"></path></svg>
                </div>
              </div>
            </div>
            {isAdmin && (
              <button
                onClick={handleOpenInviteModal}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white ring-offset-background transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 shadow-lg shadow-blue-500/20 gap-1.5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus w-4 h-4"><path d="M5 12h14"></path><path d="M12 5v14"></path></svg>
                Invite Staff Member
              </button>
            )}
          </div>
        </div>
      </header>

      <section className="px-6 pb-12">
        {error && staffList.length > 0 && <div className="my-2 p-3 bg-red-100 text-red-700 border border-red-200 rounded-md">Could not fully load staff data: {error}</div>}
        {loading && staffList.length > 0 && <p className="py-4 text-slate-700 text-center">Updating staff list...</p>} {/* Loading more or filtering */}

        {!loading && staffList.length === 0 && (searchQuery || roleFilter || statusFilter) ? (
             <div className="text-center py-10 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="mt-2 text-lg font-medium text-slate-800">No Staff Found</h3>
                <p className="mt-1 text-sm text-slate-500">No staff members match your current filters or search query.</p>
            </div>
        ) : !loading && staffList.length === 0 && !error ? (
             <div className="text-center py-10 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg">
                 <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                 </svg>
                <h3 className="mt-2 text-lg font-medium text-slate-800">No Staff Members</h3>
                <p className="mt-1 text-sm text-slate-500">Get started by inviting your first staff member.</p>
            </div>
        ) : staffList.length > 0 ? (
          <div className="overflow-hidden bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border-0">
            <table className="min-w-full text-sm text-left">
              <thead className="text-xs text-slate-700 uppercase bg-slate-50/70">
                <tr>
                  <th scope="col" className="px-6 py-3 font-medium text-center">Profile</th>
                  <th scope="col" className="px-6 py-3 font-medium">Name</th>
                  <th scope="col" className="px-6 py-3 font-medium">Email</th>
                  <th scope="col" className="px-6 py-3 font-medium">Role</th>
                  <th scope="col" className="px-6 py-3 font-medium text-center">Assigned Tasks</th>
                  <th scope="col" className="px-6 py-3 font-medium">Status</th>
                  <th scope="col" className="px-6 py-3 font-medium text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map((staff, index) => (
                  <tr key={staff.id} className={`bg-white/90 hover:bg-slate-50/90 transition-colors duration-150 ${index === staffList.length - 1 ? '' : 'border-b border-slate-200/80'}`}>
                    <td className="px-6 py-4 text-center">
                      <img
                        src={staff.avatar_url || '/assets/images/placeholder-avatar.png'}
                        alt={`${`${staff.first_name || ''} ${staff.last_name || ''}`.trim() || 'Staff'}'s profile`}
                        className="w-10 h-10 rounded-full object-cover mx-auto" // Tailwind classes for profile image
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/assets/images/placeholder-avatar.png';
                        }}
                      />
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">{`${staff.first_name || ''} ${staff.last_name || ''}`.trim() || 'N/A'}</td>
                    <td className="px-6 py-4 text-slate-700 whitespace-nowrap">{staff.email}</td>
                    <td className="px-6 py-4 text-slate-700 whitespace-nowrap">{staff.user_role || 'N/A'}</td>
                    <td className="px-6 py-4 text-slate-700 whitespace-nowrap text-center">N/A</td> {/* Placeholder for task count */}
                    <td className="px-6 py-4">
                      <span className={getStaffStatusBadgeClasses(staff.user_status)}>
                        {staff.user_status || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {isAdmin && (
                        <StaffActionsDropdown
                          staffMember={staff}
                          isAdmin={isAdmin} // This prop might be redundant if all actions are admin-only in dropdown
                          onEditStaff={handleOpenEditModal}
                          onDeactivateStaff={handleDeleteStaff} // handleDeleteStaff is the "Set Inactive" action
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null }
        {/* Fallback for other unhandled states, though previous conditions should cover most. */}

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
              if ( pageNumber === 1 || pageNumber === totalPages || (pageNumber >= page - 1 && pageNumber <= page + 1) ) {
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
              } else if ( (pageNumber === page - 2 && page > 3) || (pageNumber === page + 2 && page < totalPages - 2) ) {
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

      {isAdmin && isInviteModalOpen && ( <InviteStaffModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} onStaffInvited={handleStaffInvited} roleOptions={roleOptions} /> )}
      {isAdmin && isEditModalOpen && editingStaffMember && ( <EditStaffModal isOpen={isEditModalOpen} onClose={() => {setIsEditModalOpen(false); setEditingStaffMember(null);}} staffMember={editingStaffMember} onStaffUpdated={handleStaffUpdated} roleOptions={roleOptions} statusOptions={statusOptions} /> )}
    </>
  );
};
export default StaffPage;
