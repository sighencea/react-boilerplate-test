import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '../../context/AuthContext'; // Import useAuth

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
        company_id: companyId, // Add company_id here
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

      onSave(supaResponse.data); // Pass saved data back (optional)
      handleClose();
    } catch (err) {
      console.error('Error saving property:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    // Resetting form state is handled by useEffect on isOpen change now
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1" role="dialog">
      <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable"> {/* modal-lg for more space */}
        <div className="modal-content">
          <form onSubmit={handleSubmit}>
            <div className="modal-header">
              <h5 className="modal-title">{property ? 'Edit Property' : 'Add New Property'}</h5>
              <button type="button" className="btn-close" aria-label="Close" onClick={handleClose} disabled={loading}></button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-danger">{error}</div>}

              <div className="mb-3">
                <label htmlFor="property_name" className="form-label">Property Name*</label>
                <input type="text" className="form-control" id="property_name" name="property_name" value={formData.property_name} onChange={handleChange} required disabled={loading} />
              </div>

              <div className="mb-3">
                <label htmlFor="address" className="form-label">Address*</label>
                <textarea className="form-control" id="address" name="address" value={formData.address} onChange={handleChange} required disabled={loading} rows="3"></textarea>
              </div>

              <div className="mb-3">
                <label htmlFor="property_type" className="form-label">Property Type*</label>
                <select className="form-select" id="property_type" name="property_type" value={formData.property_type} onChange={handleChange} required disabled={loading}>
                  <option value="">Select type...</option>
                  <option value="Residential">Residential</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Industrial">Industrial</option>
                  <option value="Land">Land</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="mb-3">
                <label htmlFor="property_occupier" className="form-label">Occupier*</label>
                <select className="form-select" id="property_occupier" name="property_occupier" value={formData.property_occupier} onChange={handleChange} required disabled={loading}>
                  <option value="">Select occupier...</option>
                  <option value="Owner-Occupied">Owner-Occupied</option>
                  <option value="Tenant-Occupied">Tenant-Occupied</option>
                  <option value="Vacant">Vacant</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className="mb-3">
                <label htmlFor="property_details" className="form-label">Property Details</label>
                <textarea className="form-control" id="property_details" name="property_details" rows="3" value={formData.property_details} onChange={handleChange} disabled={loading}></textarea>
              </div>

              <div className="mb-3">
                <label htmlFor="property_image_file" className="form-label">Property Image</label>
                <input type="file" className="form-control" id="property_image_file" name="property_image_file" onChange={handleChange} disabled={loading} accept="image/*" />
                {imagePreviewUrl ? (
                  <img src={imagePreviewUrl} alt="Image Preview" style={{maxWidth: '100%', maxHeight: '200px', marginTop: '10px'}} />
                ) : formData.property_image_url ? ( // Show existing image if no new preview and existing URL
                  <img src={formData.property_image_url} alt="Current property" style={{maxWidth: '100%', maxHeight: '200px', marginTop: '10px'}} />
                ) : (
                  <div className="mt-2" id="imagePreviewPlaceholder" style={{minHeight: '50px', border: '1px dashed #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><small>Image preview</small></div>
                )}
              </div>
              {/* Add other form fields here based on your properties table schema */}

            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={loading}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? (property ? 'Saving...' : 'Adding...') : (property ? 'Save Changes' : 'Add Property')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddEditPropertyModal;
