import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';

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

  // Conditional rendering of the modal is handled by the `show` prop of <Modal>
  // The useEffect hook already handles resetting state when isOpen becomes false.
  // The parent component should ensure staffMember is valid when isOpen is true.
  if (!staffMember && isOpen) { // If open but no staff member, maybe show loading or error, or rely on parent not to open
      return null; // Or a placeholder/loading state if preferred
  }


  return (
    <Modal show={isOpen} onHide={handleClose} centered backdrop="static">
      <Modal.Header closeButton disabled={loading}>
        <Modal.Title>Edit Staff Member: {formData.full_name || email}</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && <div className="alert alert-danger">{error}</div>}
          {successMessage && <div className="alert alert-success">{successMessage}</div>}

          <Form.Group className="mb-3" controlId="editStaffFullName">
            <Form.Label>Full Name</Form.Label>
            <Form.Control type="text" name="full_name" value={formData.full_name} onChange={handleChange} disabled={loading} />
          </Form.Group>
          <Form.Group className="mb-3" controlId="editStaffEmail">
            <Form.Label>Email Address</Form.Label>
            <Form.Control type="email" name="email" value={email} disabled={true} readOnly />
            <Form.Text className="text-muted">Email address cannot be changed here.</Form.Text>
          </Form.Group>
          <Form.Group className="mb-3" controlId="editStaffRole">
            <Form.Label>Role*</Form.Label>
            <Form.Select name="role" value={formData.role} onChange={handleChange} required disabled={loading}>
              {roleOptions && roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
            </Form.Select>
          </Form.Group>
          <Form.Group className="mb-3" controlId="editStaffUserStatus">
            <Form.Label>Status*</Form.Label>
            <Form.Select name="user_status" value={formData.user_status} onChange={handleChange} required disabled={loading}>
              {statusOptions && statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? 'Saving Changes...' : 'Save Changes'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default EditStaffModal;
