import React, { useState } from 'react';

const LanguageSelectionModal = ({ isOpen, onClose, onSaveLanguage }) => {
  const [selectedLang, setSelectedLang] = useState('en'); // Default to English
  const [feedback, setFeedback] = useState({ text: '', type: '' });

  if (!isOpen) return null;

  const handleSave = async () => {
    setFeedback({ text: 'Saving...', type: 'info' });
    try {
      const result = await onSaveLanguage(selectedLang);
      if (result && result.success) {
        setFeedback({ text: result.message || 'Language preference saved.', type: 'success' });
        // Optionally close modal on success
        // setTimeout(onClose, 1500);
      } else {
        setFeedback({ text: result.message || 'Failed to save language preference.', type: 'danger' });
      }
    } catch (error) {
      setFeedback({ text: error.message || 'An unexpected error occurred.', type: 'danger' });
    }
  };

  const handleClose = () => {
    // setSelectedLang('en'); // Optionally reset lang on close, or keep last selection
    setFeedback({ text: '', type: '' });
    onClose();
  };

  return (
    <div className={`modal fade ${isOpen ? 'show' : ''}`} style={{ display: isOpen ? 'block' : 'none' }} data-bs-backdrop="static" data-bs-keyboard="false" tabIndex="-1" role="dialog" id="languageSelectionModal">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="languageSelectionModalLabel" data-i18n="languageSelectionModal.title">Select Your Preferred Language</h5>
            {/* No close button (X) in the header as per original HTML to force a choice, but providing one for React component usability */}
             <button type="button" className="btn-close" aria-label="Close" onClick={handleClose}></button>
          </div>
          <div className="modal-body">
            <p data-i18n="languageSelectionModal.description">Please choose the language you'd like to use in Property Hub.</p>
            <div className="form-floating mb-3">
              <select
                className="form-select"
                id="languageSelectDropdown"
                value={selectedLang}
                onChange={(e) => setSelectedLang(e.target.value)}
              >
                <option value="en" data-i18n="languageSelectionModal.optionEnglish">English</option>
                <option value="de" data-i18n="languageSelectionModal.optionGerman">German</option>
              </select>
              <label htmlFor="languageSelectDropdown" data-i18n="languageSelectionModal.selectLabel">Language</label>
            </div>
            {feedback.text && <div className={`alert alert-${feedback.type || 'info'} mt-2`}>{feedback.text}</div>}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-primary w-100" id="saveLanguagePreferenceButton" onClick={handleSave} data-i18n="languageSelectionModal.continueButton">Continue</button>
          </div>
        </div>
      </div>
      {isOpen && <div className="modal-backdrop fade show"></div>}
    </div>
  );
};

export default LanguageSelectionModal;
