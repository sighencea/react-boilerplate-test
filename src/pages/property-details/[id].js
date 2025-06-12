import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '@/lib/supabaseClient'; // Adjust path if necessary
import Link from 'next/link'; // For a "Back to Properties" link

const PropertyDetailsPage = () => {
  const router = useRouter();
  const { id } = router.query; // Access the dynamic 'id' parameter

  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (router.isReady) { // Ensure router query params are available
      if (id) { // Only fetch if id is available
        setLoading(true);
        setError(null);
        setProperty(null); // Reset property state before new fetch

        const fetchProperty = async () => {
          try {
            const { data, error: dbError } = await supabase
              .from('properties')
              .select('*') // Select all columns for now, can be refined later if needed
              .eq('id', id)
              .single();

            if (dbError) {
              throw dbError;
            }

            if (data) {
              setProperty(data);
            } else {
              // This case should ideally be caught by .single() if id doesn't exist,
              // which would result in an error. If data is null without error,
              // it implies a successful query with no result, so property not found.
              setProperty(null);
            }
          } catch (err) {
            console.error('Error fetching property details:', err);
            setError(err.message || 'Failed to fetch property details.');
            setProperty(null);
          } finally {
            setLoading(false);
          }
        };

        fetchProperty();
      } else {
        // No id present even when router is ready
        setLoading(false);
        setProperty(null);
        // Optionally set an error message here if an ID was expected but not found
        // setError("Property ID is missing in the URL.");
      }
    }
  }, [id, router.isReady, supabase]); // Added supabase to dependency array as it's used in useEffect

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
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="display-5"> {/* Larger title for details page */}
          {property.property_name || 'Property Details'}
        </h1>
        <div className="btn-group">
          {/* TODO: Implement Edit, Add Task, Delete functionality later */}
          {/* These buttons will require modals and handlers similar to PropertiesPage */}
          <button type="button" className="btn btn-outline-primary" disabled>Edit Property</button>
          <button type="button" className="btn btn-outline-secondary" disabled>Add Task</button>
          <button type="button" className="btn btn-outline-danger" disabled>Delete Property</button>
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
    </div>
  );
};

export default PropertyDetailsPage;
