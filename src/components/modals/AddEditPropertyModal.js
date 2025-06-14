import React, { useState, useEffect, useCallback, useRef } from 'react'; // Added useCallback and useRef
import QRCode from 'qrcode';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
// import Modal from 'react-bootstrap/Modal'; // Removed
// import Button from 'react-bootstrap/Button'; // Removed
// import Form from 'react-bootstrap/Form';   // Removed
// Row and Col are not strictly necessary for this layout if mb-3 provides enough spacing

// SVG Icon Component for Close button
const IconX = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

// Helper function for QR Code processing
async function processQrCodeForProperty(newProperty, currentUser, supabaseClient) {
  if (!newProperty || !newProperty.id || !currentUser || !currentUser.id || !supabaseClient) {
    console.warn('Missing data for QR code processing. Property ID:', newProperty?.id, 'User ID:', currentUser?.id);
    return newProperty;
  }

  let updatedProperty = { ...newProperty };

  try {
    const propertyDetailUrl = `${window.location.origin}/property-details/${updatedProperty.id}`;
    const qrDataURLGenerated = await QRCode.toDataURL(propertyDetailUrl, {
      errorCorrectionLevel: 'H', type: 'image/png', quality: 0.9, margin: 1,
    });

    if (!qrDataURLGenerated) {
      console.warn(`QR code dataURL generation returned empty for property ID: ${updatedProperty.id}`);
      return updatedProperty; // Return original property, no QR URL
    }
    console.log('QR Data URL generated for property ID:', updatedProperty.id);


    const response = await fetch(qrDataURLGenerated);
    const blob = await response.blob();

    if (!blob) {
      console.warn(`Failed to convert QR dataURL to Blob for property ID: ${updatedProperty.id}`);
      return updatedProperty; // Return original property
    }
    console.log('QR Blob created for property ID:', updatedProperty.id);


    const qrFilePath = `users/${currentUser.id}/qr_codes/qr_${updatedProperty.id}.png`;
    const { data: qrUploadData, error: qrUploadError } = await supabaseClient.storage
      .from('property-qr-codes')
      .upload(qrFilePath, blob, { cacheControl: '3600', upsert: true });

    if (qrUploadError) {
      console.error(`Non-critical: Error uploading QR code for property ${updatedProperty.id}.`, qrUploadError);
      return updatedProperty; // Return original property
    }
    console.log('QR code uploaded successfully for property ID:', updatedProperty.id, 'Path:', qrUploadData.path);


    const { data: publicUrlData } = supabaseClient.storage
      .from('property-qr-codes')
      .getPublicUrl(qrUploadData.path);

    if (!publicUrlData || !publicUrlData.publicUrl) {
      console.error(`Non-critical: Error getting public URL for QR code from path ${qrUploadData.path} for property ${updatedProperty.id}.`);
      return updatedProperty; // Return original property
    }

    const qrCodeImageUrl = publicUrlData.publicUrl;
    console.log('Public QR Code URL obtained for property ID:', updatedProperty.id, qrCodeImageUrl);

    const { error: updateError } = await supabaseClient
      .from('properties')
      .update({ qr_code_image_url: qrCodeImageUrl, generate_qr_on_creation: true })
      .eq('id', updatedProperty.id);

    if (updateError) {
      console.error(`Non-critical: Error updating property ${updatedProperty.id} with QR code URL.`, updateError);
      // Return property without QR URL if DB update fails
    } else {
      console.log(`Property ${updatedProperty.id} updated successfully with QR code URL.`);
      updatedProperty.qr_code_image_url = qrCodeImageUrl;
      updatedProperty.generate_qr_on_creation = true;
    }
  } catch (qrProcessError) {
    console.error(`Non-critical: Overall error during QR code processing for property ${updatedProperty.id}.`, qrProcessError);
    // In case of any error during the process, return the property object as it was before this attempt
  }
  return updatedProperty;
}


const AddEditPropertyModal = ({ isOpen, onClose, property, onSave }) => {
  const { user } = useAuth(); // Get user from AuthContext
  const [formData, setFormData] = useState({
    property_name: '', // Renamed from name
    address: '',
    property_type: '',
    property_occupier: '', // Renamed from occupier
    property_details: '',
    property_image_url: '', // Renamed from image_url
    property_image_file: null,
  });
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (property) { // Editing existing property
      setFormData({
        property_name: property.property_name || property.name || '',
        address: [property.address_street, property.address_city, property.address_state, property.address_zip].filter(Boolean).join(', ') || property.address || '',
        property_type: property.property_type || '',
        property_occupier: property.property_occupier || property.occupier || '',
        property_details: property.property_details || '',
        property_image_url: property.property_image_url || property.image_url || '',
        property_image_file: null,
      });
      setImagePreviewUrl(property.property_image_url || property.image_url || null);
    } else { // Adding new property, reset form
      setFormData({
        property_name: '',
        address: '',
        property_type: '',
        property_occupier: '',
        property_details: '',
        property_image_url: '',
        property_image_file: null,
      });
      setImagePreviewUrl(null);
    }
    setError(null); // Clear error when modal opens or property changes
  }, [property, isOpen]);

  // useEffect for revoking object URL (cleanup)
  useEffect(() => {
    return () => {
      if (imagePreviewUrl && imagePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreviewUrl);
      }
    };
  }, [imagePreviewUrl]);

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === 'file' && name === 'property_image_file') {
      const file = files && files.length > 0 ? files[0] : null;
      setFormData(prev => ({ ...prev, property_image_file: file, property_image_url: '' })); // Clear old URL
      if (imagePreviewUrl && imagePreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imagePreviewUrl); // Revoke old blob URL
      }
      if (file) {
        setImagePreviewUrl(URL.createObjectURL(file));
      } else {
        // If file is cleared, try to show original image_url if available (during edit)
        setImagePreviewUrl(property ? (property.property_image_url || property.image_url || null) : null);
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (!user || !user.id) {
        console.error("User not available or user ID missing. Cannot upload image or determine company.");
        setError("User information is missing. Please ensure you are logged in.");
        setLoading(false);
        return;
      }

      let finalImageUrl = formData.property_image_url; // Default to existing/previous URL

      if (formData.property_image_file) {
        const file = formData.property_image_file;
        // New: users/${user.id}/property_images/...
        const fileName = `users/${user.id}/property_images/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '')}`;

        // setLoading(true); // Already set at the beginning of handleSubmit
        // setError(null); // Already set at the beginning of handleSubmit

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('property-images') // Your specified bucket name
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false // Consider true if updates should replace, false if new name always
          });

        if (uploadError) {
          console.error('Error uploading image:', uploadError);
          setError(`Image upload failed: ${uploadError.message}`);
          // setLoading(false); // This will be handled by the finally block
          return; // Stop submission if image upload fails
        }

        const { data: publicUrlData } = supabase.storage
          .from('property-images')
          .getPublicUrl(uploadData.path);

        if (!publicUrlData || !publicUrlData.publicUrl) {
            console.error('Error getting public URL for image:', publicUrlData);
            setError('Failed to get image URL after upload.');
            // setLoading(false); // This will be handled by the finally block
            return; // Stop submission
        }
        finalImageUrl = publicUrlData.publicUrl;
      }

      // Fetch company_id for the current user
      let companyId;
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .eq('owner_id', user.id)
        .single();

      if (companyError || !companyData) {
        console.error('Error fetching company for user:', user.id, companyError);
        setError('Failed to find company linked to your account. Please ensure your user account is correctly associated with a company.');
        setLoading(false);
        return;
      }
      companyId = companyData.id;

      // Prepare data for saving (this should be after companyId is successfully fetched)
      const propertyDataToSave = {
        property_name: formData.property_name,
        address: formData.address,
        property_type: formData.property_type,
        property_occupier: formData.property_occupier,
        property_details: formData.property_details,
        property_image_url: finalImageUrl, // finalImageUrl is determined before this block
        company_id: companyId,
        user_id: user.id, // Add user_id here
      };

      // Ensure numeric fields are numbers if your DB expects them (e.g., num_bedrooms)
      // Example: propertyDataToSave.num_bedrooms = parseInt(propertyDataToSave.num_bedrooms, 10) || 0;

      let supaResponse;
      if (property && property.id) { // Editing
        supaResponse = await supabase
          .from('properties')
          .update(propertyDataToSave)
          .eq('id', property.id)
          .select() // select() to get the updated row back if needed
          .single(); // if expecting a single row
      } else { // Adding
        supaResponse = await supabase
          .from('properties')
          .insert(propertyDataToSave)
          .select()
          .single();
      }

      if (supaResponse.error) throw supaResponse.error;

      let finalPropertyData = supaResponse.data;

      if (!property && finalPropertyData && finalPropertyData.id && user && user.id) { // Only for new properties
        // Call the refactored QR code processing function
        // supabase client is passed from the import at the top of the file
        finalPropertyData = await processQrCodeForProperty(finalPropertyData, user, supabase);
      }

      onSave(finalPropertyData); // Pass the potentially updated property data
      handleClose();
    } catch (err) {
      console.error('Error saving property:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const modalRef = useRef(null);
  const [animationClass, setAnimationClass] = useState('opacity-0 scale-95');

  useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => {
        setAnimationClass('opacity-100 scale-100');
      });
    } else {
      setAnimationClass('opacity-0 scale-95');
    }
  }, [isOpen]);

  const handleBackdropClick = (e) => {
    if (modalRef.current && e.target === modalRef.current) {
      // Static backdrop: do nothing
      return;
    }
  };

  if (!isOpen && animationClass === 'opacity-0 scale-95') {
    return null;
  }

  return (
    <div
      ref={modalRef}
      onClick={handleBackdropClick}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-opacity duration-300 ease-in-out ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      aria-labelledby="add-edit-property-modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[95vh] transform transition-all duration-300 ease-in-out ${animationClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-200">
          <h3 id="add-edit-property-modal-title" className="text-xl font-semibold text-slate-800">
            {property ? 'Edit Property' : 'Add New Property'}
          </h3>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1"
            aria-label="Close modal"
          >
            <IconX className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} id="property-form" className="flex-grow p-6 overflow-y-auto space-y-6">
            {error &&
              <div className="p-3 text-sm text-red-700 bg-red-100 border border-red-300 rounded-lg">
                {error}
              </div>
            }

            <div>
              <label htmlFor="formPropertyName" className="block text-sm font-medium text-slate-700 mb-1">Property Name*</label>
              <input type="text" id="formPropertyName" name="property_name" value={formData.property_name} onChange={handleChange} required disabled={loading}
                     className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500" />
            </div>

            <div>
              <label htmlFor="formPropertyAddress" className="block text-sm font-medium text-slate-700 mb-1">Address*</label>
              <textarea id="formPropertyAddress" name="address" rows={3} value={formData.address} onChange={handleChange} required disabled={loading}
                        className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500" />
            </div>

            <div>
              <label htmlFor="formPropertyType" className="block text-sm font-medium text-slate-700 mb-1">Property Type*</label>
              <select id="formPropertyType" name="property_type" value={formData.property_type} onChange={handleChange} required disabled={loading}
                      className="block w-full pl-3 pr-10 py-2 text-sm border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500">
                <option value="">Select type...</option>
                <option value="Residential">Residential</option>
                <option value="Commercial">Commercial</option>
                <option value="Industrial">Industrial</option>
                <option value="Land">Land</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="formPropertyOccupier" className="block text-sm font-medium text-slate-700 mb-1">Occupier*</label>
              <select id="formPropertyOccupier" name="property_occupier" value={formData.property_occupier} onChange={handleChange} required disabled={loading}
                      className="block w-full pl-3 pr-10 py-2 text-sm border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500">
                <option value="">Select occupier...</option>
                <option value="Owner-Occupied">Owner-Occupied</option>
                <option value="Tenant-Occupied">Tenant-Occupied</option>
                <option value="Vacant">Vacant</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="formPropertyDetails" className="block text-sm font-medium text-slate-700 mb-1">Property Details</label>
              <textarea id="formPropertyDetails" name="property_details" rows={3} value={formData.property_details} onChange={handleChange} disabled={loading}
                        className="block w-full px-3 py-2 text-sm border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-500" />
            </div>

            <div>
              <label htmlFor="formPropertyImageFile" className="block text-sm font-medium text-slate-700 mb-1">Property Image</label>
              <input type="file" id="formPropertyImageFile" name="property_image_file" onChange={handleChange} disabled={loading} accept="image/*"
                     className="block w-full text-sm text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:pointer-events-none" />
              {imagePreviewUrl ? (
                <img src={imagePreviewUrl} alt="Image Preview" className="mt-2 w-full max-h-48 object-contain rounded border border-slate-200" />
              ) : formData.property_image_url ? (
                <img src={formData.property_image_url} alt="Current property" className="mt-2 w-full max-h-48 object-contain rounded border border-slate-200" />
              ) : (
                <div className="mt-2 flex h-24 items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">Image preview</div>
              )}
            </div>
        </form>
        {/* Modal Footer is now a sibling to the form */}
        <div className="flex justify-end items-center gap-3 p-4 bg-slate-50 rounded-b-2xl border-t border-slate-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="property-form" // Link to the form id
              disabled={loading}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            >
              {loading ? (property ? 'Saving...' : 'Adding...') : (property ? 'Save Changes' : 'Add Property')}
            </button>
        </div>
      </div>
    </div>
  );
};

export default AddEditPropertyModal;
