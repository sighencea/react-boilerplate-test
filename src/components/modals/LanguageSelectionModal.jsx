import React, { useState } from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';

const LanguageSelectionModal = ({ isOpen, onClose, onSaveLanguage }) => {
  const [selectedLang, setSelectedLang] = useState('en'); // Default to English
  const [feedback, setFeedback] = useState({ text: '', type: '' });

  // if (!isOpen) return null; // Removed, Modal show prop handles this

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
    <Modal show={isOpen} onHide={handleClose} backdrop="static" keyboard={false} centered id="languageSelectionModal">
      <Modal.Header closeButton>
        <Modal.Title id="languageSelectionModalLabel" data-i18n="languageSelectionModal.title">Select Your Preferred Language</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p data-i18n="languageSelectionModal.description">Please choose the language you'd like to use in Property Hub.</p>
        {/* Using Form.Group and Form.Select. Floating label is default with react-bootstrap Form.Control/Select inside Form.Floating */}
        {/* For simplicity, using standard label here. Form.Floating can be added if exact style is crucial. */}
        <Form.Group className="mb-3" controlId="languageSelectDropdown">
          <Form.Label data-i18n="languageSelectionModal.selectLabel">Language</Form.Label>
          <Form.Select
            value={selectedLang}
            onChange={(e) => setSelectedLang(e.target.value)}
          >
            <option value="en" data-i18n="languageSelectionModal.optionEnglish">English</option>
            <option value="de" data-i18n="languageSelectionModal.optionGerman">German</option>
          </Form.Select>
        </Form.Group>
        {feedback.text && <div className={`alert alert-${feedback.type || 'info'} mt-2`}>{feedback.text}</div>}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" className="w-100" id="saveLanguagePreferenceButton" onClick={handleSave} data-i18n="languageSelectionModal.continueButton">Continue</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default LanguageSelectionModal;
