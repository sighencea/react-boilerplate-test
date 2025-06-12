import React from 'react';

const QrCodeModal = ({ isOpen, onClose, qrCodeUrl, propertyName }) => {
  if (!isOpen) {
    return null;
  }

  // Sanitize propertyName for use in download filename
  const sanitizedPropertyName = propertyName ? propertyName.replace(/[^a-zA-Z0-9_.-]/g, '_').replace(/\s+/g, '_') : 'property';
  const downloadFilename = `qr_code_${sanitizedPropertyName}.png`;

  return (
    <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0, 0, 0, 0.5)' }} tabIndex="-1" role="dialog" aria-labelledby="qrCodeModalLabel" aria-hidden={!isOpen}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="qrCodeModalLabel">
              QR Code for {propertyName || 'Property'}
            </h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose}></button>
          </div>
          <div className="modal-body text-center"> {/* Added text-center for the image */}
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
          </div>
          <div className="modal-footer">
            {/* Optional: Close button if needed, but header X is standard */}
            {/* <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button> */}
            {qrCodeUrl && (
              <a
                href={qrCodeUrl}
                download={downloadFilename}
                className="btn btn-success" // Green download button
                role="button"
              >
                Download
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QrCodeModal;
