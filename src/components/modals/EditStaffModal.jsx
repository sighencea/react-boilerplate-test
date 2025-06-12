import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

const EditStaffModal = ({ isOpen, onClose, staffMember, onStaffUpdated, roleOptions, statusOptions }) => {
  const [formData, setFormData] = useState({
    full_name: '', // Might be editable
    role: '',
    user_status: '',
  });
  const [email, setEmail] = useState(''); // Typically not editable directly if it's the auth identifier
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (isOpen && staffMember) {
      setFormData({
        full_name: staffMember.full_name || '',
        role: staffMember.role || '',
        user_status: staffMember.user_status || '',
      });
      setEmail(staffMember.email || '');
      setError(null);
      setSuccessMessage('');
    } else if (!isOpen) { // Reset when modal is not open, e.g. on close
      setFormData({ full_name: '', role: '', user_status: '' });
      setEmail('');
    }
  }, [isOpen, staffMember]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage('');

    try {
      // Prepare only the fields that are meant to be updated from this form
      const updates = {
        full_name: formData.full_name,
        role: formData.role,
        user_status: formData.user_status,
        // Supabase policy should prevent company_id or is_admin from being changed here by non-superadmin.
      };

      const { data, error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', staffMember.id) // Ensure update is targeted by staff member's profile ID
        .select() // Optionally select the updated record back
        .single(); // If expecting one record

      if (updateError) throw updateError;

      setSuccessMessage('Staff member details updated successfully!');
      if (onStaffUpdated) onStaffUpdated(data); // Pass updated data back
      // Optionally close modal after a delay
      // setTimeout(handleClose, 2000);
    } catch (err) {
      console.error('Error updating staff member:', err);
      setError(err.message || 'Failed to update staff member.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  if (!isOpen || !staffMember) return null;

  return (
    <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1" role="dialog">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <form onSubmit={handleSubmit}>
            <div className="modal-header">
              <h5 className="modal-title">Edit Staff Member: {formData.full_name || email}</h5>
              <button type="button" className="btn-close" aria-label="Close" onClick={handleClose} disabled={loading}></button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-danger">{error}</div>}
              {successMessage && <div className="alert alert-success">{successMessage}</div>}

              <div className="mb-3">
                <label htmlFor="editStaffFullName" className="form-label">Full Name</label>
                <input type="text" className="form-control" id="editStaffFullName" name="full_name" value={formData.full_name} onChange={handleChange} disabled={loading} />
              </div>
              <div className="mb-3">
                <label htmlFor="editStaffEmail" className="form-label">Email Address</label>
                <input type="email" className="form-control" id="editStaffEmail" name="email" value={email} disabled={true} readOnly />
                <small className="form-text text-muted">Email address cannot be changed here.</small>
              </div>
              <div className="mb-3">
                <label htmlFor="editStaffRole" className="form-label">Role*</label>
                <select className="form-select" id="editStaffRole" name="role" value={formData.role} onChange={handleChange} required disabled={loading}>
                  {roleOptions && roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="mb-3">
                <label htmlFor="editStaffUserStatus" className="form-label">Status*</label>
                <select className="form-select" id="editStaffUserStatus" name="user_status" value={formData.user_status} onChange={handleChange} required disabled={loading}>
                  {statusOptions && statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={loading}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Saving Changes...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
      {isOpen && <div className="modal-backdrop fade show"></div>}
    </div>
  );
};

export default EditStaffModal;
