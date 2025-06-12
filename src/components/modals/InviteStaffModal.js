import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '../../context/AuthContext'; // To get company_id

const InviteStaffModal = ({ isOpen, onClose, onStaffInvited, roleOptions }) => {
  const { user } = useAuth(); // For company_id
  const [formData, setFormData] = useState({
    email: '',
    firstName: '', // Changed
    lastName: '',  // Changed
    role: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setFormData({ email: '', firstName: '', lastName: '', role: roleOptions && roleOptions.length > 0 ? roleOptions[0] : '' });
      setError(null);
      setSuccessMessage('');
    }
  }, [isOpen, roleOptions]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user?.app_metadata?.company_id) {
      setError("Company information not found for admin.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMessage('');

    try {
      // Call the 'invite-staff-member' Supabase Edge Function
      const { data: inviteData, error: inviteError } = await supabase.functions.invoke('invite-staff-member', {
        body: {
          // company_id is derived by the Edge Function from the authenticated user
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          userRole: formData.role, // Changed from role to userRole
        }
      });

      if (inviteError) throw inviteError;

      // Assuming Edge Function returns a success message or relevant data
      setSuccessMessage(inviteData?.message || 'Staff member invited successfully! They will receive an email with instructions.');
      if (onStaffInvited) onStaffInvited(); // Callback to refresh staff list on parent page
      // Optionally close modal after a delay or keep open to show success
      // setTimeout(handleClose, 3000);
      setFormData({ email: '', firstName: '', lastName: '', role: roleOptions && roleOptions.length > 0 ? roleOptions[0] : '' }); // Clear form
    } catch (err) {
      console.error('Error inviting staff member:', err);
      let displayError = 'Failed to invite staff member.';
      if (err.context && err.context.json && err.context.json.error) {
        displayError = err.context.json.error;
      } else if (err.message) {
        displayError = err.message;
      }
      setError(displayError);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Resetting form is handled by useEffect on isOpen change
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1" role="dialog">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <form onSubmit={handleSubmit}>
            <div className="modal-header">
              <h5 className="modal-title">Invite New Staff Member</h5>
              <button type="button" className="btn-close" aria-label="Close" onClick={handleClose} disabled={loading}></button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-danger">{error}</div>}
              {successMessage && <div className="alert alert-success">{successMessage}</div>}

              <div className="row">
                <div className="col-md-6 mb-3">
                  <label htmlFor="firstName" className="form-label">First Name*</label>
                  <input type="text" className="form-control" id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} required disabled={loading} />
                </div>
                <div className="col-md-6 mb-3">
                  <label htmlFor="lastName" className="form-label">Last Name*</label>
                  <input type="text" className="form-control" id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} required disabled={loading} />
                </div>
              </div>
              <div className="mb-3">
                <label htmlFor="email" className="form-label">Email Address*</label>
                <input type="email" className="form-control" id="email" name="email" value={formData.email} onChange={handleChange} required disabled={loading} />
              </div>
              <div className="mb-3">
                <label htmlFor="role" className="form-label">Role*</label>
                <select className="form-select" id="role" name="role" value={formData.role} onChange={handleChange} required disabled={loading}>
                  {roleOptions && roleOptions.length > 0 ? (
                    roleOptions.map(r => <option key={r} value={r}>{r}</option>)
                  ) : (
                    <option value="" disabled>No roles available</option>
                  )}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={loading}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Sending Invitation...' : 'Send Invitation'}
              </button>
            </div>
          </form>
        </div>
      </div>
      {isOpen && <div className="modal-backdrop fade show"></div>}
    </div>
  );
};

export default InviteStaffModal;
