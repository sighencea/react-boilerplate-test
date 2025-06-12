import React, { useState } from 'react';

const CompanyCodeModal = ({ isOpen, onClose, onVerifyCode, onVerifyEmail, onSetPassword }) => {
  const [currentStep, setCurrentStep] = useState(1); // 1: Enter Code, 2: Enter Email, 3: Set Password
  const [companyCode, setCompanyCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [feedback, setFeedback] = useState({ text: '', type: '' });

  if (!isOpen) return null;

  const resetFormStates = () => {
    setCompanyCode('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setFeedback({ text: '', type: '' });
  };

  const handleClose = () => {
    resetFormStates();
    setCurrentStep(1); // Reset to first step
    onClose();
  };

  const handleVerifyCode = async () => {
    if (!/^\d{8}$/.test(companyCode)) {
      setFeedback({ text: 'Please enter a valid 8-digit company code.', type: 'warning' }); return;
    }
    setFeedback({ text: 'Verifying code...', type: 'info' });
    const result = await onVerifyCode(companyCode);
    if (result && result.success) {
      setFeedback({ text: result.message || 'Code verified!', type: 'success' });
      setCurrentStep(2);
    } else {
      setFeedback({ text: result.message || 'Invalid company code.', type: 'danger' });
    }
  };

  const handleVerifyEmail = async () => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setFeedback({ text: 'Please enter a valid email address.', type: 'warning' }); return;
    }
    setFeedback({ text: 'Verifying email...', type: 'info' });
    const result = await onVerifyEmail(email);
    if (result && result.success) {
      setFeedback({ text: result.message || 'Email verified!', type: 'success' });
      setCurrentStep(3);
    } else {
      setFeedback({ text: result.message || 'Email not registered or error.', type: 'danger' });
    }
  };

  const handleSubmitPassword = async (e) => {
    e.preventDefault(); // Form submission
    if (password.length < 6) {
      setFeedback({ text: 'Password must be at least 6 characters long.', type: 'warning' }); return;
    }
    if (password !== confirmPassword) {
      setFeedback({ text: 'Passwords do not match.', type: 'warning' }); return;
    }
    setFeedback({ text: 'Setting password...', type: 'info' });
    const result = await onSetPassword(password); // Assumes email context is handled by parent or Supabase session
    if (result && result.success) {
      setFeedback({ text: result.message || 'Account activated successfully!', type: 'success' });
      // setTimeout(handleClose, 2000);
    } else {
      setFeedback({ text: result.message || 'Failed to set password.', type: 'danger' });
    }
  };

  return (
    <div className={`modal fade ${isOpen ? 'show' : ''}`} style={{ display: isOpen ? 'block' : 'none' }} tabIndex="-1" role="dialog" id="companyCodeModal">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="companyCodeModalLabel" data-i18n="companyCodeModal.titleInitial">Join Your Company</h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={handleClose}></button>
          </div>
          <div className="modal-body">
            <form id="companyCodeForm" onSubmit={currentStep === 3 ? handleSubmitPassword : (e) => e.preventDefault()}>
              {currentStep === 1 && (
                <div id="companyCodeStep1">
                  <p data-i18n="companyCodeModal.descriptionCode">Please enter the 8-digit code provided by your agency.</p>
                  <div className="form-floating mb-3">
                    <input type="tel" className="form-control" id="companyCodeInput" placeholder="12345678" value={companyCode} onChange={(e) => setCompanyCode(e.target.value)} maxLength="8" pattern="[0-9]{8}" required />
                    <label htmlFor="companyCodeInput" data-i18n="companyCodeModal.inputLabelCode">Company Code</label>
                  </div>
                  <button type="button" className="btn btn-primary w-100" onClick={handleVerifyCode} data-i18n="companyCodeModal.buttonVerifyCode">Verify Code</button>
                </div>
              )}
              {currentStep === 2 && (
                <div id="companyCodeStep2">
                  <p data-i18n="companyCodeModal.descriptionEmail">Code verified! Please enter your email address registered with the agency.</p>
                  <div className="form-floating mb-3">
                    <input type="email" className="form-control" id="companyCodeEmailInput" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    <label htmlFor="companyCodeEmailInput" data-i18n="companyCodeModal.inputLabelEmail">Your Email Address</label>
                  </div>
                  <button type="button" className="btn btn-primary w-100" onClick={handleVerifyEmail} data-i18n="companyCodeModal.buttonVerifyEmail">Verify Email</button>
                </div>
              )}
              {currentStep === 3 && (
                <div id="companyCodeStep3">
                  <p data-i18n="companyCodeModal.descriptionPassword">Email verified! Please set your password to activate your account.</p>
                  <div className="form-floating mb-3">
                    <input type="password" className="form-control" id="companyCodePasswordInput" placeholder="New Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength="6" />
                    <label htmlFor="companyCodePasswordInput" data-i18n="companyCodeModal.inputLabelPassword">New Password</label>
                  </div>
                  <div className="form-floating mb-3">
                    <input type="password" className="form-control" id="companyCodeConfirmPasswordInput" placeholder="Confirm New Password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength="6" />
                    <label htmlFor="companyCodeConfirmPasswordInput" data-i18n="companyCodeModal.inputLabelConfirmPassword">Confirm New Password</label>
                  </div>
                  <button type="submit" className="btn btn-success w-100" data-i18n="companyCodeModal.buttonSetPassword">Set Password & Join</button>
                </div>
              )}
            </form>
            {feedback.text && <div id="companyCodeMessage" className={`alert alert-${feedback.type || 'info'} mt-3`}>{feedback.text}</div>}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={handleClose} data-i18n="companyCodeModal.buttonClose">Close</button>
          </div>
        </div>
      </div>
      {isOpen && <div className="modal-backdrop fade show"></div>}
    </div>
  );
};

export default CompanyCodeModal;
