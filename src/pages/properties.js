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
        .select('id, property_name, address, property_image_url, property_type, qr_code_image_url, created_at, tasks(count)', { count: 'exact' })
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
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" id="propertyCardsContainer">
            {properties.map(property => (
              <Link href={`/property-details/${property.id}`} key={property.id} passHref>
                <article className="group cursor-pointer">
                  <div data-slot="card" className="text-card-foreground flex flex-col gap-6 rounded-xl py-6 overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 bg-white/80 backdrop-blur-sm">
                    <div className="relative">
                      <figure className="aspect-[4/3] overflow-hidden m-0 p-0">
                        <img
                          alt={property.property_name || 'Property image'}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 align-top block"
                          src={property.property_image_url || '/assets/images/placeholder-avatar.png'}
                          onError={(e) => { e.target.onerror = null; e.target.src='/assets/images/placeholder-avatar.png'; }}
                        />
                      </figure>
                      {/* Task Count Badge START */}
                      {(() => {
                        const taskCount = property.tasks && property.tasks.length > 0 ? property.tasks[0].count : 0;
                        let badgeClasses = '';
                        let badgeText = '';

                        if (taskCount === 0) {
                          badgeClasses = 'bg-emerald-100 text-emerald-700 border-emerald-200';
                          badgeText = 'No Active Tasks';
                        } else if (taskCount <= 3) { // Example: 1-3 tasks
                          badgeClasses = 'bg-rose-100 text-rose-700 border-rose-200';
                          badgeText = `${taskCount} Task${taskCount > 1 ? 's' : ''}`;
                        } else { // Example: >3 tasks
                          badgeClasses = 'bg-amber-100 text-amber-700 border-amber-200';
                          badgeText = `${taskCount} Task${taskCount > 1 ? 's' : ''}`;
                        }

                        return (
                          <div className="absolute top-4 right-4" style={{ opacity: 1, transform: 'none' }}>
                            <span
                              className={`inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs w-fit whitespace-nowrap shrink-0 gap-1 font-medium shadow-sm backdrop-blur-sm ${badgeClasses}`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-circle-check w-3 h-3 mr-1">
                                <circle cx="12" cy="12" r="10"></circle>
                                <path d="m9 12 2 2 4-4"></path>
                              </svg>
                              {badgeText}
                            </span>
                          </div>
                        );
                      })()}
                      {/* Task Count Badge END */}
                    </div>
                    <div data-slot="card-content" className="p-6"> {/* Corrected padding to p-6 */}
                      <header className="mb-4">
                        <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-700 transition-colors">
                          {property.property_name || 'N/A'}
                        </h3>
                        <address className="text-slate-600 not-italic text-sm leading-relaxed">
                          {property.address || 'N/A'}
                        </address>
                      </header>
                      <div className="flex flex-row items-center justify-between gap-2 mt-2">
                        <button
                          aria-label={`View details for ${property.property_name || 'property'}`}
                          className="inline-flex items-center justify-center gap-2 whitespace-nowrap h-9 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-700 hover:text-blue-800 border border-blue-200 hover:border-blue-300 transition-all duration-200 font-medium rounded-lg text-sm flex-shrink-0"
                          // onClick is not needed here as the Link will handle navigation
                        >
                          View Details
                        </button>
                        {property.qr_code_image_url && (
                          <button
                            type="button"
                            aria-label={`Show QR code for ${property.property_name || 'property'}`}
                            className="ml-2 p-2 rounded-lg border border-transparent bg-white/60 hover:bg-blue-50 hover:border-blue-200 transition-all duration-200 flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 group/qr"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleShowQrCode(property.qr_code_image_url, property.property_name);
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-qr-code w-5 h-5 text-blue-400 group-hover/qr:text-blue-700 transition-colors duration-200" aria-hidden="true">
                              <rect width="5" height="5" x="3" y="3" rx="1"></rect><rect width="5" height="5" x="16" y="3" rx="1"></rect><rect width="5" height="5" x="3" y="16" rx="1"></rect><path d="M21 16h-3a2 2 0 0 0-2 2v3"></path><path d="M21 21v.01"></path><path d="M12 7v3a2 2 0 0 1-2 2H7"></path><path d="M3 12h.01"></path><path d="M12 3h.01"></path><path d="M12 16v.01"></path><path d="M16 12h1"></path><path d="M21 12v.01"></path><path d="M12 21v-1"></path>
                            </svg>
                          </button>
                        )}
                      </div>
                      {isAdmin && (
                        <div className="mt-4 pt-4 border-t border-slate-200 flex justify-end gap-2">
                          <button onClick={(e) => {
                            e.preventDefault(); e.stopPropagation(); handleOpenEditModal(property);
                          }} className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200 transition-colors">Edit</button>
                          <button onClick={(e) => {
                            e.preventDefault(); e.stopPropagation(); handleDeleteProperty(property.id);
                          }} className="px-3 py-1.5 text-xs font-medium text-white bg-red-500 rounded-md hover:bg-red-600 transition-colors">Delete</button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              </Link>
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
