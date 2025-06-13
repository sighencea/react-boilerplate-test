import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext'; // Import useAuth
import Dropdown from 'react-bootstrap/Dropdown';

const TopBar = () => {
  const router = useRouter();
  const { user, isAdmin, signOut } = useAuth(); // Get signOut from AuthContext

  const [pageTitle, setPageTitle] = useState('Dashboard');
  // const [isDropdownOpen, setIsDropdownOpen] = useState(false); // Removed

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
      router.push('/'); // Redirect to SignIn page (root) after sign out
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
      if (regex.test(router.pathname)) {
        title = pathTitleMapping[key];
        break;
      }
    }
    setPageTitle(title);
  }, [router.pathname]);

  // Access Denied Modal Logic removed from TopBar as it's handled in MainLayout

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
        <Link href="/notifications" legacyBehavior={false}><a className="nav-link"><i className="bi bi-bell-fill"></i></a></Link>

        <Dropdown align="end">
          <Dropdown.Toggle variant="link" id="dropdown-user-settings" className="dropdown-toggle-no-caret p-0">
            <i className="bi bi-person-gear" style={{ fontSize: '1.5em', color: '#6B7280' }}></i>
          </Dropdown.Toggle>
          <Dropdown.Menu>
            <Dropdown.Item as={Link} href="/account" legacyBehavior={false}>
              <i className="bi bi-gear-fill me-2"></i>Account Settings
            </Dropdown.Item>
            <Dropdown.Divider />
            <Dropdown.Item onClick={handleSignOut} style={{ color: 'red' }}>
              <i className="bi bi-box-arrow-right me-2"></i>Sign Out
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </div>
    </div>
  );
};

export default TopBar;
