import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '../context/AuthContext'; // To check admin role for CRUD
import AddEditPropertyModal from '../components/modals/AddEditPropertyModal';
import QrCodeModal from '../components/modals/QrCodeModal'; // Import QrCodeModal
import Link from 'next/link';

const ITEMS_PER_PAGE = 8;

const PropertiesPage = () => {
  const { isAdmin } = useAuth(); // Get admin status
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState(null);

  // State for QR Code Modal
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [currentQrCodeUrl, setCurrentQrCodeUrl] = useState('');
  const [currentQrPropertyName, setCurrentQrPropertyName] = useState('');

  const handleShowQrCode = (qrUrl, propertyName) => {
    setCurrentQrCodeUrl(qrUrl);
    setCurrentQrPropertyName(propertyName);
    setIsQrModalOpen(true);
  };

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from('properties')
        .select('id, property_name, address, property_image_url, property_type, qr_code_image_url, created_at', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (searchQuery) {
        query = query.or(`property_name.ilike.%${searchQuery}%,address.ilike.%${searchQuery}%`);
      }

      const { data, error: dbError, count } = await query;
      if (dbError) throw dbError;

      if (page === 1) {
        setProperties(data || []);
      } else {
        setProperties(prevProperties => [...prevProperties, ...(data || [])]);
      }
      setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));
    } catch (err) {
      console.error('Error fetching properties:', err);
      setError(err.message);
      if (page === 1) {
        setProperties([]);
      }
      // For subsequent pages, an error ideally shouldn't clear already loaded items.
      // The error message will be displayed.
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  // Scroll handler for infinite scrolling
  const handleScroll = useCallback(() => {
    const buffer = 200; // Pixels from bottom to trigger load
    if (
      window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - buffer &&
      !loading &&
      page < totalPages
    ) {
      setPage(prevPage => prevPage + 1);
    }
  }, [loading, page, totalPages]);

  // Effect for attaching scroll listener
  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
    setPage(1);
  };

  const handleOpenAddModal = () => {
    setEditingProperty(null); // Clear any editing state
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (property) => {
    setEditingProperty(property);
    setIsModalOpen(true);
  };

  const handleModalSave = () => {
    setIsModalOpen(false); // Close modal
    fetchProperties();     // Refresh properties list
  };

  const handleDeleteProperty = async (propertyId) => {
    if (!isAdmin) {
      alert("You don't have permission to delete properties."); // Basic check
      return;
    }
    if (window.confirm('Are you sure you want to delete this property?')) {
      setLoading(true); // Indicate loading state for delete operation
      try {
        const { error: deleteError } = await supabase.from('properties').delete().eq('id', propertyId);
        if (deleteError) throw deleteError;
        // If current page becomes empty after deletion, go to previous page or first page
        if (properties.length === 1 && page > 1) {
            setPage(page - 1); // This will trigger fetchProperties
        } else {
            fetchProperties(); // Refresh list on current page
        }
      } catch (delError) {
        setError(delError.message);
        console.error('Error deleting property:', delError);
      } finally {
        setLoading(false);
      }
    }
  };

  if (loading && properties.length === 0) return <p data-i18n="propertiesPage.loadingMessage" className="container mt-4">Loading properties...</p>;
  // Keep error display prominent
  if (error && properties.length === 0) return <p className="container mt-4 text-danger">Error fetching properties: {error}</p>;


  return (
    <div className="container-fluid properties-page-content pt-3">
      <div className="d-flex justify-content-between align-items-center pb-2 mb-3 border-bottom">
        <h1 className="h2" data-i18n="propertiesPage.title">Properties</h1>
        {isAdmin && ( // Show Add button only to admins
          <div className="btn-toolbar mb-2 mb-md-0">
            <button type="button" className="btn btn-primary" onClick={handleOpenAddModal} data-i18n="propertiesPage.addNewButton">
              <i className="bi bi-plus-lg me-1"></i> Add New Property
            </button>
          </div>
        )}
      </div>

      <div className="row mb-3">
        <div className="col-md-4">
          <input type="text" className="form-control" placeholder="Search by name or address..." value={searchQuery} onChange={handleSearchChange} />
        </div>
      </div>

      {error && <div className="alert alert-danger">Error: {error}</div>}
      {loading && <p>Loading...</p>}

      {!loading && properties.length === 0 ? (
        <p data-i18n="propertiesPage.noPropertiesFound">No properties found.</p>
      ) : (
        <div className="row g-4" id="propertyCardsContainer">
          {properties.map(property => (
            <div className="col-lg-4 col-md-6 mb-4" key={property.id}>
              <Link href={`/property-details/${property.id}`} passHref legacyBehavior>
                <a className="card property-card-link h-100 shadow-sm text-decoration-none d-block">
                  <img
                    src={property.property_image_url || '/assets/images/card1.png'}
                  className="card-img-top property-card-img"
                  alt={`Property ${property.property_name || 'Unnamed'}`}
                  onError={(e) => { e.target.onerror = null; e.target.src='/assets/images/card_placeholder.png'; }}
                />
                <div className="card-body d-flex flex-column">
                  <h5 className="card-title text-primary">{property.property_name || 'N/A'}</h5>
                  <p className="card-text text-secondary flex-grow-1">
                    {property.address || 'N/A'}
                  </p>
                  <p className="card-text">
                    <small className="text-muted">Type: {property.property_type || 'N/A'}</small>
                  </p>
                  <div className="mt-auto d-flex justify-content-between align-items-center pt-2">
                    {property.qr_code_image_url && (
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary qr-code-button"
                        title="Show QR Code"
                        data-qr-url={property.qr_code_image_url}
                        data-property-name={property.property_name}
                        onClick={(e) => {
                          e.preventDefault(); // Added
                          e.stopPropagation();
                          handleShowQrCode(property.qr_code_image_url, property.property_name);
                        }}
                        // data-i18n="propertiesPage.card.showQrButton" // data-i18n can be added if needed
                      >
                        <i className="bi bi-qr-code"></i>
                      </button>
                    )}
                    <span className="btn btn-sm btn-outline-primary align-self-start">View Details</span>
                  </div>
                </div>
                {isAdmin && ( // Show Edit/Delete only to admins
                  <div className="card-footer bg-light d-flex justify-content-end">
                      <button onClick={(e) => { e.stopPropagation(); handleOpenEditModal(property); }} className="btn btn-sm btn-outline-secondary me-2">Edit</button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteProperty(property.id); }} className="btn btn-sm btn-outline-danger">Delete</button>
                  </div>
                )}
                </a>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Pagination controls removed for infinite scroll */}

      {isModalOpen && (
        <AddEditPropertyModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          property={editingProperty}
          onSave={handleModalSave}
        />
      )}

      {isQrModalOpen && (
        <QrCodeModal
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          qrCodeUrl={currentQrCodeUrl}
          propertyName={currentQrPropertyName}
        />
      )}
    </div>
  );
};

export default PropertiesPage;
