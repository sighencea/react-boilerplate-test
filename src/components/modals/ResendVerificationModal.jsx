import React, { useState, useEffect } from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';

const ResendVerificationModal = ({ isOpen, onClose, onResendEmail, initialEmail = '' }) => {
  const [emailForResend, setEmailForResend] = useState(initialEmail);
  const [feedback, setFeedback] = useState({ text: '', type: '' });

  useEffect(() => {
    if (isOpen) {
      setEmailForResend(initialEmail);
      setFeedback({ text: '', type: '' });
    }
  }, [isOpen, initialEmail]);

  const handleResend = async () => {
    if (!emailForResend) {
      setFeedback({ text: 'Please enter an email address.', type: 'warning' });
      return;
    }
    setFeedback({ text: 'Sending...', type: 'info' });
    try {
      const result = await onResendEmail(emailForResend);
      if (result && result.success) {
        setFeedback({ text: result.message || 'Verification email has been resent.', type: 'success' });
      } else {
        setFeedback({ text: result.message || 'Failed to resend verification email.', type: 'danger' });
      }
    } catch (error) {
      setFeedback({ text: error.message || 'An unexpected error occurred.', type: 'danger' });
    }
  };

  const handleClose = () => {
    // Email and feedback are reset by useEffect when isOpen becomes false or initialEmail changes
    onClose();
  };

  return (
    <Modal show={isOpen} onHide={handleClose} centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>Resend Verification Email</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>Please enter your email address below to receive a new verification link.</p>
        <Form.Group className="mb-3" controlId="resendEmailInputModalReact">
          <Form.Label>Email address</Form.Label>
          <Form.Control
            type="email"
            placeholder="name@example.com"
            value={emailForResend}
            onChange={(e) => setEmailForResend(e.target.value)}
          />
        </Form.Group>
        {feedback.text && <div className={`alert alert-${feedback.type || 'info'} mt-2`}>{feedback.text}</div>}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose}>Close</Button>
        <Button variant="warning" onClick={handleResend}>Resend Email</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ResendVerificationModal;
