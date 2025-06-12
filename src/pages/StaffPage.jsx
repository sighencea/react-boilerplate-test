import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import InviteStaffModal from '../components/modals/InviteStaffModal';
import EditStaffModal from '../components/modals/EditStaffModal';

const ITEMS_PER_PAGE = 10;

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
        .select('id, full_name, email, role, user_status, profile_image_url, created_at, task_assignments ( count )', { count: 'exact' })
        .eq('company_id', user.app_metadata.company_id).eq('is_admin', false)
        .order('full_name', { ascending: true });
      if (searchQuery) query = query.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`);
      if (roleFilter) query = query.eq('role', roleFilter);
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
    const confirmDeactivate = window.confirm(`Are you sure you want to set staff member ${staffMember.full_name || staffMember.email} to 'Inactive'?`);
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
  if (loading && staffList.length === 0) return <p className="container mt-4">Loading staff members...</p>;
  if (error && staffList.length === 0 && !loading) return <p className="container mt-4 text-danger">Error fetching staff: {error}</p>;

  return (
    <div className="container-fluid pt-3">
      {/* Header and Filters (same as before) */}
      <div className="d-flex justify-content-between align-items-center pb-2 mb-3 border-bottom"><h1 className="h2">Staff Management</h1>{isAdmin && (<div className="btn-toolbar mb-2 mb-md-0"><button type="button" className="btn btn-primary" onClick={handleOpenInviteModal}><i className="bi bi-person-plus-fill me-1"></i> Invite Staff Member</button></div>)}</div>
      <div className="row mb-3 gx-2"><div className="col-md-4"><input type="text" className="form-control" placeholder="Search..." value={searchQuery} onChange={handleSearchChange} /></div><div className="col-md-3"><select className="form-select" value={roleFilter} onChange={handleRoleFilterChange}><option value="">All Roles</option>{roleOptions.map(role => <option key={role} value={role}>{role}</option>)}</select></div><div className="col-md-3"><select className="form-select" value={statusFilter} onChange={handleStatusFilterChange}><option value="">All Statuses</option>{statusOptions.map(status => <option key={status} value={status}>{status}</option>)}</select></div></div>
      {error && staffList.length > 0 && <div className="alert alert-warning mt-2">Could not fully load staff data: {error}</div>}
      {loading && <p>Loading...</p>}
      {!loading && staffList.length === 0 && !error ? (<p>No staff members found.</p>) : (
        <div className="table-responsive"><table className="table table-hover">
            <thead className="table-light"><tr><th>Profile</th><th>Name</th><th>Email</th><th>Role</th><th>Assigned Tasks</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{staffList.map(staff => ( <tr key={staff.id}>
                <td><img src={staff.profile_image_url || '/assets/images/placeholder-avatar.png'} alt={`${staff.full_name || 'Staff'}'s profile`} className="rounded-circle" style={{width: '40px', height: '40px', objectFit: 'cover'}} onError={(e)=>{e.target.src='/assets/images/placeholder-avatar.png';}} /></td>
                <td>{staff.full_name || 'N/A'}</td><td>{staff.email}</td><td>{staff.role || 'N/A'}</td>
                <td className="text-center">{staff.task_assignments && staff.task_assignments.length > 0 ? staff.task_assignments[0].count : 0}</td>
                <td><span className={`badge bg-${staff.user_status === 'Active' ? 'success' : (staff.user_status === 'Invited' || staff.user_status === 'New' ? 'warning text-dark' : 'secondary')}`}>{staff.user_status || 'N/A'}</span></td>
                <td>{isAdmin && (<span> <button className="btn btn-sm btn-outline-secondary me-1" onClick={() => handleOpenEditModal(staff)} title="Edit"><i className="bi bi-pencil"></i></button> <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteStaff(staff)} title="Deactivate"><i className="bi bi-person-x"></i></button> </span>)}</td>
            </tr>))}</tbody>
        </table></div>)}
      {/* Pagination (simplified for brevity) */}
      {totalPages > 1 && ( <nav className="mt-4"><ul className="pagination justify-content-center"><li className={`page-item ${page === 1 ? 'disabled' : ''}`}><button className="page-link" onClick={() => setPage(p => p - 1)} disabled={page === 1}>Previous</button></li>{[...Array(totalPages).keys()].map(num => ( <li key={num + 1} className={`page-item ${page === num + 1 ? 'active' : ''}`}><button className="page-link" onClick={() => setPage(num + 1)}>{num + 1}</button></li>))}<li className={`page-item ${page === totalPages ? 'disabled' : ''}`}><button className="page-link" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>Next</button></li></ul></nav> )}

      {isAdmin && isInviteModalOpen && ( <InviteStaffModal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} onStaffInvited={handleStaffInvited} roleOptions={roleOptions} /> )}
      {isAdmin && isEditModalOpen && editingStaffMember && ( <EditStaffModal isOpen={isEditModalOpen} onClose={() => {setIsEditModalOpen(false); setEditingStaffMember(null);}} staffMember={editingStaffMember} onStaffUpdated={handleStaffUpdated} roleOptions={roleOptions} statusOptions={statusOptions} /> )}
    </div>);};
export default StaffPage;
