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
    // Main container for the page, Tailwind classes can be added here if needed for overall page background or max-width etc.
    // For now, assuming MainLayout handles overall page chrome.
    <>
      <header className="sticky top-6 z-40 mx-6 mb-8"> {/* Adjusted top to align with sidebar's top-6, assuming topbar is gone or different */}
        <div className="backdrop-blur-xl bg-white/80 border border-white/20 rounded-2xl shadow-xl shadow-black/5 p-6">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-search absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400">
                  <circle cx="11" cy="11" r="8"></circle><path d="m21 21-4.3-4.3"></path>
                </svg>
                <input
                  type="text"
                  className="file:text-foreground placeholder:text-muted-foreground focus-visible:ring-ring hover:bg-muted/50 inline-flex h-10 w-full items-center justify-center whitespace-nowrap rounded-xl border-0 bg-transparent px-3 py-2 text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 pl-10 bg-white/60 border-slate-200 focus:bg-white"
                  placeholder="Search properties..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => console.log('Filter clicked')}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-xl border border-slate-200 bg-white/60 px-3 py-2 text-sm font-medium text-slate-700 ring-offset-background transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 gap-1.5"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-filter w-4 h-4">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                  </svg>
                  Filter
                </button>
                <div className="flex rounded-lg border border-slate-200 bg-white/60 p-1">
                  <button
                    onClick={() => console.log('Grid view clicked')}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-700 ring-offset-background transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-slate-100"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-layout-grid w-4 h-4">
                      <rect width="7" height="7" x="3" y="3" rx="1"></rect><rect width="7" height="7" x="14" y="3" rx="1"></rect><rect width="7" height="7" x="14" y="14" rx="1"></rect><rect width="7" height="7" x="3" y="14" rx="1"></rect>
                    </svg>
                  </button>
                  <button
                    onClick={() => console.log('List view clicked')}
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-700 ring-offset-background transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-list w-4 h-4">
                      <line x1="8" x2="21" y1="6" y2="6"></line><line x1="8" x2="21" y1="12" y2="12"></line><line x1="8" x2="21" y1="18" y2="18"></line><line x1="3" x2="3.01" y1="6" y2="6"></line><line x1="3" x2="3.01" y1="12" y2="12"></line><line x1="3" x2="3.01" y1="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            {isAdmin && (
              <button
                onClick={handleOpenAddModal}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white ring-offset-background transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 shadow-lg shadow-blue-500/20 gap-1.5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus w-4 h-4">
                  <path d="M5 12h14"></path><path d="M12 5v14"></path>
                </svg>
                Add Property
              </button>
            )}
          </div>
        </div>
      </header>

      <section className="px-6 pb-12">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-slate-900 mb-2" data-i18n="propertiesPage.title">Properties</h2>
          <p className="text-slate-600 max-w-2xl" data-i18n="propertiesPage.description">Manage and monitor all your properties from one central dashboard. Track maintenance tasks, view property details, and stay organized.</p>
        </div>

        {error && <div className="alert alert-danger">Error: {error}</div>}
        {/* loading state is handled by the initial page load check */}
        {/* {!loading && properties.length === 0 below handles no properties after load */}

        {!loading && properties.length === 0 ? (
          <p data-i18n="propertiesPage.noPropertiesFound">No properties found.</p>
        ) : (
          <div className="row g-4" id="propertyCardsContainer"> {/* Using Bootstrap grid classes for cards for now */}
            {properties.map(property => (
              <div className="col-lg-4 col-md-6 mb-4" key={property.id}>
                <Link href={`/property-details/${property.id}`} passHref legacyBehavior>
                  <a className="card property-card-link h-100 shadow-sm text-decoration-none d-block"> {/* These are Bootstrap card classes */}
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
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleShowQrCode(property.qr_code_image_url, property.property_name);
                            }}
                          >
                            <i className="bi bi-qr-code"></i>
                          </button>
                        )}
                         {/* Replaced span with a more descriptive text or keep as is if design implies icon only */}
                        <span className="text-primary small fw-medium">View Details</span>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="card-footer bg-light d-flex justify-content-end">
                          <button onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleOpenEditModal(property);
                          }} className="btn btn-sm btn-outline-secondary me-2">Edit</button>
                          <button onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDeleteProperty(property.id);
                          }} className="btn btn-sm btn-outline-danger">Delete</button>
                      </div>
                    )}
                  </a>
                </Link>
              </div>
            ))}
          </div>
        )}
         {/* Loading indicator for infinite scroll */}
        {loading && properties.length > 0 && <p className="text-center mt-4">Loading more properties...</p>}


      </section>

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
    </>
  );
};

export default PropertiesPage;
