import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

const AddEditPropertyModal = ({ isOpen, onClose, property, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    address: '', // New single address field
    property_type: '', // New field
    occupier: '', // New field
    property_details: '', // Renamed from description
    image_url: '', // Keep for now, for existing data and URL input fallback
    property_image_file: null, // For the new file input
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (property) { // Editing existing property
      setFormData({
        name: property.name || '',
        address: [property.address_street, property.address_city, property.address_state, property.address_zip].filter(Boolean).join(', ') || '',
        property_type: property.property_type || '',
        occupier: property.occupier || '',
        property_details: property.property_details || '', // Renamed
        image_url: property.image_url || '',
        property_image_file: null,
      });
    } else { // Adding new property, reset form
      setFormData({
        name: '',
        address: '',
        property_type: '',
        occupier: '',
        property_details: '', // Renamed
        image_url: '',
        property_image_file: null,
      });
    }
    setError(null); // Clear error when modal opens or property changes
  }, [property, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === 'file') {
      setFormData(prev => ({ ...prev, property_image_file: files && files.length > 0 ? files[0] : null }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      let supaResponse;
      const propertyData = {
        name: formData.name,
        address: formData.address,
        property_type: formData.property_type,
        occupier: formData.occupier,
        property_details: formData.property_details, // Renamed
        image_url: formData.image_url, // Retain existing image_url or if user manually enters one
        // company_id should be handled here if applicable, e.g. from auth context
      };
      // Ensure numeric fields are numbers if your DB expects them (e.g., num_bedrooms)
      // Example: propertyData.num_bedrooms = parseInt(propertyData.num_bedrooms, 10) || 0;

      if (property && property.id) { // Editing
        supaResponse = await supabase
          .from('properties')
          .update(propertyData)
          .eq('id', property.id)
          .select() // select() to get the updated row back if needed
          .single(); // if expecting a single row
      } else { // Adding
        // company_id needs to be set. Assuming it's available from user's session/profile
        // This is a placeholder. In a real app, get company_id from AuthContext or user profile.
        // const { data: { user } } = await supabase.auth.getUser();
        // const companyId = user?.user_metadata?.company_id; // Or app_metadata
        // if (!companyId) throw new Error("Company ID not found for the user.");
        // propertyData.company_id = companyId;
        // For now, let's assume company_id might be optional or handled by RLS/default value in DB

        supaResponse = await supabase
          .from('properties')
          .insert(propertyData)
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
                <label htmlFor="name" className="form-label">Property Name*</label>
                <input type="text" className="form-control" id="name" name="name" value={formData.name} onChange={handleChange} required disabled={loading} />
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
                <label htmlFor="occupier" className="form-label">Occupier*</label>
                <select className="form-select" id="occupier" name="occupier" value={formData.occupier} onChange={handleChange} required disabled={loading}>
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
                <div className="mt-2" id="imagePreviewPlaceholder" style={{minHeight: '50px', border: '1px dashed #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center'}}><small>Image preview</small></div>
                {/* Display existing image_url if no new file is selected and image_url exists */}
                {!formData.property_image_file && formData.image_url && (
                  <div className="mt-2">
                    <small>Current image:</small>
                    <img src={formData.image_url} alt="Current property" style={{maxWidth: '100px', maxHeight: '100px', display: 'block'}} />
                  </div>
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
