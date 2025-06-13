import React from 'react';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';

const QrCodeModal = ({ isOpen, onClose, qrCodeUrl, propertyName }) => {
  // Sanitize propertyName for use in download filename
  const sanitizedPropertyName = propertyName ? propertyName.replace(/[^a-zA-Z0-9_.-]/g, '_').replace(/\s+/g, '_') : 'property';
  const downloadFilename = `qr_code_${sanitizedPropertyName}.png`;

  return (
    <Modal show={isOpen} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title id="qrCodeModalLabel">
          QR Code for {propertyName || 'Property'}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="text-center"> {/* Added text-center for the image */}
        {qrCodeUrl ? (
          <img
            src={qrCodeUrl}
            alt={`QR Code for ${propertyName || 'Property'}`}
            className="img-fluid" // Bootstrap class for responsive images
            style={{ maxWidth: '300px', maxHeight: '300px', margin: 'auto' }} // Ensure it's not overly large
          />
        ) : (
          <p>QR Code not available.</p>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Close</Button>
        {qrCodeUrl && (
          <Button variant="success" href={qrCodeUrl} download={downloadFilename}>
            Download
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default QrCodeModal;
