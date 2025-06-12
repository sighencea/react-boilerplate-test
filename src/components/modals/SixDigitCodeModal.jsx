import React, { useState } from 'react';

const SixDigitCodeModal = ({ isOpen, onClose, onSubmitCode }) => {
  const [code, setCode] = useState('');
  const [feedback, setFeedback] = useState({ text: '', type: '' });

  if (!isOpen) return null;

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
    <div className={`modal fade ${isOpen ? 'show' : ''}`} style={{ display: isOpen ? 'block' : 'none' }} tabIndex="-1" role="dialog" id="sixDigitCodeModal">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="sixDigitCodeModalLabel" data-i18n="sixDigitCodeModal.title">Enter Verification Code</h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={handleClose}></button>
          </div>
          <div className="modal-body">
            <p data-i18n="sixDigitCodeModal.description">For your security, please enter the 8-digit code.</p>
            <div className="form-floating mb-3">
              <input
                type="tel"
                className="form-control"
                id="sixDigitCodeInput"
                placeholder="12345678"
                maxLength="8"
                pattern="[0-9]{8}"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              <label htmlFor="sixDigitCodeInput" data-i18n="sixDigitCodeModal.inputLabel">8-digit Code</label>
            </div>
            {feedback.text && <div id="sixDigitCodeMessage" className={`alert alert-${feedback.type || 'info'} mt-2`}>{feedback.text}</div>}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={handleClose} data-i18n="sixDigitCodeModal.closeButton">Close</button>
            <button type="button" className="btn btn-primary" id="submitSixDigitCodeButton" onClick={handleSubmit} data-i18n="sixDigitCodeModal.verifyButton">Verify Code</button>
          </div>
        </div>
      </div>
      {isOpen && <div className="modal-backdrop fade show"></div>}
    </div>
  );
};

export default SixDigitCodeModal;
