import React, { useState, useEffect } from 'react';

const ResendVerificationModal = ({ isOpen, onClose, onResendEmail, initialEmail = '' }) => {
  const [emailForResend, setEmailForResend] = useState(initialEmail);
  const [feedback, setFeedback] = useState({ text: '', type: '' });

  useEffect(() => {
    if (isOpen) {
      setEmailForResend(initialEmail); // Reset email when modal opens if initialEmail changes or on first open
      setFeedback({ text: '', type: '' }); // Clear feedback when modal opens
    }
  }, [isOpen, initialEmail]);


  if (!isOpen) return null;

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
    <div className={`modal fade ${isOpen ? 'show' : ''}`} style={{ display: isOpen ? 'block' : 'none' }} tabIndex="-1" role="dialog">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Resend Verification Email</h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={handleClose}></button>
          </div>
          <div className="modal-body">
            <p>Please enter your email address below to receive a new verification link.</p>
            <div className="form-floating mb-3">
              <input
                type="email"
                className="form-control"
                id="resendEmailInputModalReact"
                placeholder="name@example.com"
                value={emailForResend}
                onChange={(e) => setEmailForResend(e.target.value)}
              />
              <label htmlFor="resendEmailInputModalReact">Email address</label>
            </div>
            {feedback.text && <div className={`alert alert-${feedback.type || 'info'} mt-2`}>{feedback.text}</div>}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={handleClose}>Close</button>
            <button type="button" className="btn btn-warning" onClick={handleResend}>Resend Email</button>
          </div>
        </div>
      </div>
      {isOpen && <div className="modal-backdrop fade show"></div>}
    </div>
  );
};

export default ResendVerificationModal;
