import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext'; // To check admin role for CRUD
import AddEditPropertyModal from '../components/modals/AddEditPropertyModal';
import { Link } from 'react-router-dom';

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

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from('properties')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,address_street.ilike.%${searchQuery}%`);
      }

      const { data, error: dbError, count } = await query;
      if (dbError) throw dbError;

      setProperties(data || []);
      setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));
    } catch (err) {
      console.error('Error fetching properties:', err);
      setError(err.message);
      setProperties([]);
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

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
        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 row-cols-xl-4 g-4" id="propertyCardsContainer">
          {properties.map(property => (
            <div className="col" key={property.id}>
              <div className="card h-100 shadow-sm">
                <img
                  src={property.image_url || '/assets/images/card1.png'}
                  className="card-img-top property-card-img"
                  alt={`Property ${property.name || 'Unnamed'}`}
                  onError={(e) => { e.target.onerror = null; e.target.src='/assets/images/card_placeholder.png'; }}
                />
                <div className="card-body d-flex flex-column">
                  <h5 className="card-title">{property.name || 'N/A'}</h5>
                  <p className="card-text text-muted small">
                    {property.address_street || 'N/A'}, {property.address_city || 'N/A'}
                  </p>
                  <Link to={`/property-details/${property.id}`} className="text-primary small mt-auto align-self-start">View Details</Link>
                </div>
                {isAdmin && ( // Show Edit/Delete only to admins
                  <div className="card-footer bg-light d-flex justify-content-end">
                      <button onClick={() => handleOpenEditModal(property)} className="btn btn-sm btn-outline-secondary me-2">Edit</button>
                      <button onClick={() => handleDeleteProperty(property.id)} className="btn btn-sm btn-outline-danger">Delete</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <nav aria-label="Page navigation" className="mt-4">
          <ul className="pagination justify-content-center">
            <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => setPage(p => p - 1)} disabled={page === 1}>Previous</button>
            </li>
            {[...Array(totalPages).keys()].map(num => (
              <li key={num + 1} className={`page-item ${page === num + 1 ? 'active' : ''}`}>
                <button className="page-link" onClick={() => setPage(num + 1)}>{num + 1}</button>
              </li>
            ))}
            <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
              <button className="page-link" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>Next</button>
            </li>
          </ul>
        </nav>
      )}

      {isModalOpen && (
        <AddEditPropertyModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          property={editingProperty}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
};

export default PropertiesPage;
