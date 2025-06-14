import React, { useState, useEffect, useRef } from 'react'; // Added useRef
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '../../context/AuthContext'; // To get company_id

// SVG Icon Component for Close button
const IconX = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const InviteStaffModal = ({ isOpen, onClose, onStaffInvited, roleOptions }) => {
  const { user } = useAuth(); // For company_id
  const modalRef = useRef(null);
  const [animationClass, setAnimationClass] = useState('opacity-0 scale-95');
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
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

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        setAnimationClass('opacity-100 scale-100');
      });
    } else {
      setAnimationClass('opacity-0 scale-95');
    }
  }, [isOpen]);

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
    onClose();
  };

  const handleBackdropClick = (e) => {
    if (modalRef.current && e.target === modalRef.current) {
      return; // Static backdrop
    }
  };

  if (!isOpen && animationClass === 'opacity-0 scale-95') {
    return null;
  }

  return (
    <div
      ref={modalRef}
      onClick={handleBackdropClick}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      aria-labelledby="invite-staff-modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`relative bg-white w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[95vh] transform transition-all duration-300 ease-in-out ${animationClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-200">
          <h3 id="invite-staff-modal-title" className="text-xl font-semibold text-slate-800">
            Invite New Staff Member
          </h3>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-300"
            aria-label="Close modal"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        {/* Form becomes the scrollable body */}
        <form onSubmit={handleSubmit} id="invite-staff-form" className="flex-grow p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-100 border border-red-300 rounded-lg" role="alert">
              {error}
            </div>
          )}
          {successMessage && (
            <div className="p-3 text-sm text-green-700 bg-green-100 border border-green-300 rounded-lg" role="alert">
              {successMessage}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-6">
            <div>
              <label htmlFor="inviteFirstName" className="block text-sm font-medium text-slate-700 mb-1">First Name*</label>
              <input type="text" id="inviteFirstName" name="firstName" value={formData.firstName} onChange={handleChange} required disabled={loading}
                     className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500" />
            </div>
            <div>
              <label htmlFor="inviteLastName" className="block text-sm font-medium text-slate-700 mb-1">Last Name*</label>
              <input type="text" id="inviteLastName" name="lastName" value={formData.lastName} onChange={handleChange} required disabled={loading}
                     className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500" />
            </div>
          </div>

          <div>
            <label htmlFor="inviteEmail" className="block text-sm font-medium text-slate-700 mb-1">Email Address*</label>
            <input type="email" id="inviteEmail" name="email" value={formData.email} onChange={handleChange} required disabled={loading}
                   className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500" />
          </div>

          <div>
            <label htmlFor="inviteRole" className="block text-sm font-medium text-slate-700 mb-1">Role*</label>
            <select id="inviteRole" name="role" value={formData.role} onChange={handleChange} required disabled={loading}
                    className="block w-full pl-3 pr-10 py-2 text-sm border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500">
              {roleOptions && roleOptions.length > 0 ? (
                roleOptions.map(r => <option key={r} value={r}>{r}</option>)
              ) : (
                <option value="" disabled>No roles available</option>
              )}
            </select>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="flex justify-end items-center gap-3 p-4 bg-slate-50 rounded-b-2xl border-t border-slate-200">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="invite-staff-form"
            disabled={loading}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Sending Invitation...' : 'Send Invitation'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InviteStaffModal;
