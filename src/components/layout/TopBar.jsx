import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom'; // Import useNavigate
import { useAuth } from '../../context/AuthContext'; // Import useAuth

const TopBar = () => {
  const location = useLocation();
  const navigate = useNavigate(); // For redirection
  const { user, isAdmin, signOut } = useAuth(); // Get signOut from AuthContext

  const [pageTitle, setPageTitle] = useState('Dashboard');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  // const isAdmin = localStorage.getItem('userIsAdmin') === 'true'; // Now using isAdmin from useAuth()

  const handleSidebarToggle = () => {
    document.getElementById('sidebar')?.classList.toggle('active');
    document.querySelector('.sidebar-overlay')?.classList.toggle('active');
  };

  const handleSignOut = async () => {
    const { error } = await signOut(); // Call signOut from AuthContext
    if (error) {
      console.error('Error signing out:', error);
      // Optionally display an error to the user using a toast or alert component
    } else {
      navigate('/'); // Redirect to SignIn page (root) after sign out
    }
  };

  useEffect(() => {
    const pathTitleMapping = {
      '/dashboard': 'Dashboard',
      '/properties': 'Properties',
      '/tasks': 'Tasks',
      '/staff': 'Staff',
      '/notifications': 'Notifications',
      '/account': 'Account Settings',
      '/agency-setup': 'Agency Setup',
      '/property-details/:propertyId': 'Property Details'
    };
    // Match dynamic routes like /property-details/:propertyId
    let title = 'Property Hub';
    for (const key in pathTitleMapping) {
      const regex = new RegExp(`^${key.replace(/:\w+/g, '[^/]+')}$`);
      if (regex.test(location.pathname)) {
        title = pathTitleMapping[key];
        break;
      }
    }
    setPageTitle(title);
  }, [location.pathname]);

  // Access Denied Modal Logic (remains the same as it relies on Bootstrap JS)
  const adminOnlyPages = ['/dashboard', '/properties', '/staff'];
  // Use isAdmin from context now
  const isAccessingAdminPageAsNonAdmin = user && !isAdmin && adminOnlyPages.includes(location.pathname);

  useEffect(() => {
    const accessDeniedModalEl = document.getElementById('accessDeniedModal');
    if (accessDeniedModalEl) {
        if (typeof bootstrap !== 'undefined' && typeof bootstrap.Modal !== 'undefined') {
            const modalInstance = bootstrap.Modal.getInstance(accessDeniedModalEl) || new bootstrap.Modal(accessDeniedModalEl);
            if (isAccessingAdminPageAsNonAdmin) {
                if(modalInstance && typeof modalInstance.show === 'function') modalInstance.show();
            } else {
                if (modalInstance && typeof modalInstance.hide === 'function' && accessDeniedModalEl.classList.contains('show')) {
                     modalInstance.hide();
                }
            }
        } else {
            console.warn('Bootstrap Modal JS not available for accessDeniedModal control.');
        }
    }
    const redirectToTasksBtn = document.getElementById('redirectToTasksBtn');
    if(redirectToTasksBtn) {
        // This button might not exist in the new TopBar structure, but if it does, update its navigation
        redirectToTasksBtn.onclick = () => { navigate('/tasks'); }; // Use React Router navigate
    }
  }, [isAccessingAdminPageAsNonAdmin, navigate]);


  return (
    <div className="top-bar">
      <button
        className="btn d-lg-none me-2"
        type="button"
        id="sidebarToggler"
        aria-label="Toggle sidebar"
        onClick={handleSidebarToggle}
      >
        <i className="bi bi-list"></i>
      </button>
      <div className="page-title">
        <span data-i18n={`${pageTitle.toLowerCase().replace(' ', '')}Page.header`}>{pageTitle}</span>
      </div>
      <div className="top-bar-icons d-flex align-items-center">
        <Link to="/notifications"><i className="bi bi-bell-fill"></i></Link>
        <div className="dropdown">
          <a className="dropdown-toggle dropdown-toggle-no-caret" href="#!" role="button" onClick={(e) => { e.preventDefault(); setIsDropdownOpen(!isDropdownOpen); }} aria-expanded={isDropdownOpen}>
            <i className="bi bi-person-gear"></i>
          </a>
          <ul className={`dropdown-menu dropdown-menu-end ${isDropdownOpen ? 'show' : ''}`}>
            <li>
              <Link className="dropdown-item" to="/account" onClick={() => setIsDropdownOpen(false)}>
                <i className="bi bi-gear-fill me-2"></i>Account Settings
              </Link>
            </li>
            <li><hr className="dropdown-divider" /></li>
            <li>
              <button className="dropdown-item" onClick={() => { handleSignOut(); setIsDropdownOpen(false); }} style={{ color: 'red' }}>
                <i className="bi bi-box-arrow-right me-2"></i>Sign Out
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
