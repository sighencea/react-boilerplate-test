import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient'; // Adjust path if necessary
import Link from 'next/link'; // For a "Back to Properties" link
import { useAuth } from '@/context/AuthContext';
import AddEditPropertyModal from '@/components/modals/AddEditPropertyModal';

const PropertyDetailsPage = () => {
  const router = useRouter();
  const { id } = router.query; // Access the dynamic 'id' parameter
  const { isAdmin } = useAuth();

  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Define fetchPropertyById in component scope
  const fetchPropertyById = async (propertyIdToFetch) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyIdToFetch)
        .single();
      if (dbError) throw dbError;
      setProperty(data);
    } catch (err) {
      console.error('Error fetching property details:', err);
      setError(err.message || 'Failed to fetch property details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (router.isReady) {
      if (id) {
        fetchPropertyById(id);
      } else {
        setLoading(false);
        setProperty(null);
        setError("Property ID is missing in the URL.");
      }
    }
  }, [id, router.isReady]); // Removed supabase from deps, fetchPropertyById is stable if not using useCallback

  const handleOpenEditModal = () => {
    if (!property) return;
    setIsEditModalOpen(true);
  };

  const handleEditModalClose = () => {
    setIsEditModalOpen(false);
  };

  const handleEditModalSave = () => {
    setIsEditModalOpen(false);
    if (id) {
      fetchPropertyById(id); // Refetch data for the current property
    }
  };

  const handleDeleteProperty = async () => {
    if (!property || !property.id) {
      setError('Property data is missing, cannot delete.');
      return;
    }
    if (window.confirm(`Are you sure you want to delete "${property.property_name}"?`)) {
      setLoading(true); // Indicate loading state
      try {
        const { error: deleteError } = await supabase
          .from('properties')
          .delete()
          .eq('id', property.id);

        if (deleteError) throw deleteError;
        router.push('/properties');
      } catch (delError) {
        console.error('Error deleting property:', delError);
        setError(delError.message || 'Failed to delete property.');
        setLoading(false); // Reset loading on error
      }
    }
  };

  if (loading) {
    return (
      <div className="container mt-4">
        <p>Loading property details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-4">
        <p className="text-danger">Error: {error}</p>
        <Link href="/properties" legacyBehavior>
          <a className="btn btn-primary">Back to Properties</a>
        </Link>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="container mt-4">
        <p>Property not found.</p>
        <Link href="/properties" legacyBehavior>
          <a className="btn btn-primary">Back to Properties</a>
        </Link>
      </div>
    );
  }

  // Main content structure:
  return (
    <div className="container mt-4 mb-5"> {/* Added mb-5 for bottom spacing */}
      {/* Page Header: Property Name and Action Buttons */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-semibold text-slate-800">
          {property.property_name || 'Property Details'}
        </h1>
        <div className="flex gap-2">
          {isAdmin && (
            <>
              <button
                type="button"
                onClick={handleOpenEditModal}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-md hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Edit Property
              </button>
              <button
                type="button"
                onClick={handleDeleteProperty}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-md hover:bg-red-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Delete Property
              </button>
            </>
          )}
          {/* Add Task button removed as per instruction to simplify focus */}
        </div>
      </div>

      <div className="row gx-lg-5"> {/* Gutters for larger screens */}
        {/* Left Column: Image */}
        <div className="col-lg-6 mb-4 mb-lg-0">
          {property.property_image_url ? (
            <img
              src={property.property_image_url}
              alt={`Image of ${property.property_name || 'property'}`}
              className="img-fluid rounded shadow-sm" // Responsive, rounded corners, subtle shadow
              style={{maxHeight: '500px', width: '100%', objectFit: 'cover'}}
            />
          ) : (
            <div className="bg-light rounded shadow-sm d-flex justify-content-center align-items-center" style={{height: '300px', width: '100%'}}>
              <p className="text-muted">No image available</p>
            </div>
          )}
        </div>

        {/* Right Column: Details */}
        <div className="col-lg-6">
          <div className="card shadow-sm">
            <div className="card-body">
              <h4 className="card-title mb-3">Details</h4>

              <dl className="row"> {/* Definition List for key-value pairs */}
                <dt className="col-sm-4">Address:</dt>
                <dd className="col-sm-8">{property.address || 'N/A'}</dd>

                <dt className="col-sm-4">Type:</dt>
                <dd className="col-sm-8">{property.property_type || 'N/A'}</dd>

                <dt className="col-sm-4">Occupancy:</dt>
                <dd className="col-sm-8">{property.property_occupier || 'N/A'}</dd>

                {/* Add other relevant fields from property object if needed here */}
                {/* Example:
                <dt className="col-sm-4">Created On:</dt>
                <dd className="col-sm-8">{new Date(property.created_at).toLocaleDateString()}</dd>
                */}
              </dl>

              <hr />

              <h5 className="mt-4 mb-2">Property Description/Notes:</h5>
              <p className="text-muted" style={{ whiteSpace: 'pre-wrap' }}> {/* pre-wrap to respect newlines */}
                {property.property_details || 'No description provided.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* TODO: Associated Tasks section - out of scope for this plan */}

      <div className="mt-5"> {/* Increased top margin for back button */}
        <Link href="/properties" legacyBehavior>
          <a className="btn btn-secondary">
            <i className="bi bi-arrow-left me-2"></i>Back to Properties
          </a>
        </Link>
      </div>

      {isEditModalOpen && property && (
        <AddEditPropertyModal
          isOpen={isEditModalOpen}
          onClose={handleEditModalClose}
          property={property}
          onSave={handleEditModalSave}
        />
      )}
    </div>
  );
};

export default PropertyDetailsPage;
