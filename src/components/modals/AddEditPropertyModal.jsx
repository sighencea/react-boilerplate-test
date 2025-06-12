import React, { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';

const AddEditPropertyModal = ({ isOpen, onClose, property, onSave }) => {
  const [formData, setFormData] = useState({
    name: '',
    address_street: '',
    address_city: '',
    address_state: '',
    address_zip: '',
    description: '',
    image_url: '', // Or handle file upload separately
    // Add other relevant fields from your 'properties' table
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (property) { // Editing existing property
      setFormData({
        name: property.name || '',
        address_street: property.address_street || '',
        address_city: property.address_city || '',
        address_state: property.address_state || '',
        address_zip: property.address_zip || '',
        description: property.description || '',
        image_url: property.image_url || '',
      });
    } else { // Adding new property, reset form
      setFormData({
        name: '', address_street: '', address_city: '', address_state: '',
        address_zip: '', description: '', image_url: '',
      });
    }
    setError(null); // Clear error when modal opens or property changes
  }, [property, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      let supaResponse;
      const propertyData = { ...formData };
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
              <div className="row">
                <div className="col-md-8 mb-3">
                  <label htmlFor="address_street" className="form-label">Street Address*</label>
                  <input type="text" className="form-control" id="address_street" name="address_street" value={formData.address_street} onChange={handleChange} required disabled={loading} />
                </div>
                <div className="col-md-4 mb-3">
                  <label htmlFor="address_city" className="form-label">City*</label>
                  <input type="text" className="form-control" id="address_city" name="address_city" value={formData.address_city} onChange={handleChange} required disabled={loading} />
                </div>
              </div>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label htmlFor="address_state" className="form-label">State/Province*</label>
                  <input type="text" className="form-control" id="address_state" name="address_state" value={formData.address_state} onChange={handleChange} required disabled={loading} />
                </div>
                <div className="col-md-6 mb-3">
                  <label htmlFor="address_zip" className="form-label">Zip/Postal Code*</label>
                  <input type="text" className="form-control" id="address_zip" name="address_zip" value={formData.address_zip} onChange={handleChange} required disabled={loading} />
                </div>
              </div>
              <div className="mb-3">
                <label htmlFor="description" className="form-label">Description</label>
                <textarea className="form-control" id="description" name="description" rows="3" value={formData.description} onChange={handleChange} disabled={loading}></textarea>
              </div>
              <div className="mb-3">
                <label htmlFor="image_url" className="form-label">Image URL</label>
                <input type="url" className="form-control" id="image_url" name="image_url" placeholder="https://example.com/image.png" value={formData.image_url} onChange={handleChange} disabled={loading} />
                {/* TODO: Implement file upload for images for better UX */}
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
      {isOpen && <div className="modal-backdrop fade show"></div>}
    </div>
  );
};

export default AddEditPropertyModal;
