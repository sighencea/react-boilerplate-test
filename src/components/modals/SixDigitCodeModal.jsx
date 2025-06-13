import React, { useState } from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';

const SixDigitCodeModal = ({ isOpen, onClose, onSubmitCode }) => {
  const [code, setCode] = useState('');
  const [feedback, setFeedback] = useState({ text: '', type: '' });

  // if (!isOpen) return null; // Removed

  const handleSubmit = async () => {
    if (!code || !/^\d{8}$/.test(code)) { // Original was 8-digit, not 6
      setFeedback({ text: 'Please enter a valid 8-digit code.', type: 'warning' }); // TODO: i18n
      return;
    }
    setFeedback({ text: 'Verifying...', type: 'info' });
    try {
      const result = await onSubmitCode(code);
      if (result && result.success) {
        setFeedback({ text: result.message || 'Code verified successfully.', type: 'success' });
        // Optionally close modal on success, or let parent handle it
        // setTimeout(onClose, 1500);
      } else {
        setFeedback({ text: result.message || 'Code verification failed.', type: 'danger' });
      }
    } catch (error) {
      setFeedback({ text: error.message || 'An unexpected error occurred.', type: 'danger' });
    }
  };

  const handleClose = () => {
    setCode('');
    setFeedback({ text: '', type: '' });
    onClose();
  };

  return (
    <Modal show={isOpen} onHide={handleClose} centered backdrop="static" id="sixDigitCodeModal">
      <Modal.Header closeButton>
        <Modal.Title id="sixDigitCodeModalLabel" data-i18n="sixDigitCodeModal.title">Enter Verification Code</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p data-i18n="sixDigitCodeModal.description">For your security, please enter the 8-digit code.</p>
        <Form.Group className="mb-3" controlId="sixDigitCodeInput">
          <Form.Label data-i18n="sixDigitCodeModal.inputLabel">8-digit Code</Form.Label>
          <Form.Control
            type="tel"
            placeholder="12345678"
            maxLength="8"
            pattern="[0-9]{8}"
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </Form.Group>
        {feedback.text && <div id="sixDigitCodeMessage" className={`alert alert-${feedback.type || 'info'} mt-2`}>{feedback.text}</div>}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} data-i18n="sixDigitCodeModal.closeButton">Close</Button>
        <Button variant="primary" id="submitSixDigitCodeButton" onClick={handleSubmit} data-i18n="sixDigitCodeModal.verifyButton">Verify Code</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default SixDigitCodeModal;
