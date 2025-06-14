import React, { useState, useEffect, useRef } from 'react'; // Added useRef
import { supabase } from '@/lib/supabaseClient';

// SVG Icon Component for Close button
const IconX = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const EditStaffModal = ({ isOpen, onClose, staffMember, onStaffUpdated, roleOptions, statusOptions }) => {
  const modalRef = useRef(null);
  const [animationClass, setAnimationClass] = useState('opacity-0 scale-95');
  const [formData, setFormData] = useState({
    full_name: '',
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

  // Conditional rendering of the modal is handled by the `show` prop of <Modal>
  // The useEffect hook already handles resetting state when isOpen becomes false.
  // The parent component should ensure staffMember is valid when isOpen is true.
  if (!staffMember && isOpen) {
      return null;
  }

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
      aria-labelledby="edit-staff-modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`relative bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col max-h-[95vh] transform transition-all duration-300 ease-in-out ${animationClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center p-3 border-b border-slate-200">
          <h3 id="edit-staff-modal-title" className="text-xl font-semibold text-slate-800">
            Edit Staff: {formData.full_name || email}
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
        <form onSubmit={handleSubmit} id="edit-staff-form" className="flex-grow p-6 overflow-y-auto space-y-6">
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

          <div>
            <label htmlFor="editStaffFullName" className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <input type="text" id="editStaffFullName" name="full_name" value={formData.full_name} onChange={handleChange} disabled={loading}
                   className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500" />
          </div>

          <div>
            <label htmlFor="editStaffEmail" className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
            <input type="email" id="editStaffEmail" name="email" value={email} disabled={true} readOnly
                   className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500" />
            <p className="mt-1 text-xs text-slate-500">Email address cannot be changed here.</p>
          </div>

          <div>
            <label htmlFor="editStaffRole" className="block text-sm font-medium text-slate-700 mb-1">Role*</label>
            <select id="editStaffRole" name="role" value={formData.role} onChange={handleChange} required disabled={loading}
                    className="block w-full pl-3 pr-10 py-2 text-sm border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500">
              {roleOptions && roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="editStaffUserStatus" className="block text-sm font-medium text-slate-700 mb-1">Status*</label>
            <select id="editStaffUserStatus" name="user_status" value={formData.user_status} onChange={handleChange} required disabled={loading}
                    className="block w-full pl-3 pr-10 py-2 text-sm border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500">
              {statusOptions && statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="flex justify-end items-center gap-3 p-3 bg-slate-50 rounded-b-2xl border-t border-slate-200">
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
            form="edit-staff-form"
            disabled={loading}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Saving Changes...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditStaffModal;
