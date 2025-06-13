import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '../../context/AuthContext'; // To get company_id
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

const InviteStaffModal = ({ isOpen, onClose, onStaffInvited, roleOptions }) => {
  const { user } = useAuth(); // For company_id
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

  return (
    <Modal show={isOpen} onHide={handleClose} centered backdrop="static">
      <Modal.Header closeButton disabled={loading}>
        <Modal.Title>Invite New Staff Member</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && <div className="alert alert-danger">{error}</div>}
          {successMessage && <div className="alert alert-success">{successMessage}</div>}

          <Row>
            <Col md={6}>
              <Form.Group className="mb-3" controlId="inviteFirstName">
                <Form.Label>First Name*</Form.Label>
                <Form.Control type="text" name="firstName" value={formData.firstName} onChange={handleChange} required disabled={loading} />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-3" controlId="inviteLastName">
                <Form.Label>Last Name*</Form.Label>
                <Form.Control type="text" name="lastName" value={formData.lastName} onChange={handleChange} required disabled={loading} />
              </Form.Group>
            </Col>
          </Row>
          <Form.Group className="mb-3" controlId="inviteEmail">
            <Form.Label>Email Address*</Form.Label>
            <Form.Control type="email" name="email" value={formData.email} onChange={handleChange} required disabled={loading} />
          </Form.Group>
          <Form.Group className="mb-3" controlId="inviteRole">
            <Form.Label>Role*</Form.Label>
            <Form.Select name="role" value={formData.role} onChange={handleChange} required disabled={loading}>
              {roleOptions && roleOptions.length > 0 ? (
                roleOptions.map(r => <option key={r} value={r}>{r}</option>)
              ) : (
                <option value="" disabled>No roles available</option>
              )}
            </Form.Select>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? 'Sending Invitation...' : 'Send Invitation'}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default InviteStaffModal;
