import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
  const location = useLocation();
  // Placeholder for admin status - replace with actual auth context or prop
  const isAdmin = localStorage.getItem('userIsAdmin') === 'true'; // Simple check from original logic

  const isActive = (path) => location.pathname === path;

  // Links to hide for non-admins, based on original main.js updateSidebarForPermissions
  const nonAdminHiddenLinks = [
    '/dashboard',
    '/properties', // Assuming properties are admin-only view/manage
    '/staff'
  ];

  const navLinks = [
    { path: '/dashboard', icon: 'bi-speedometer2', labelKey: 'nav.dashboard', adminOnly: true },
    { path: '/properties', icon: 'bi-building', labelKey: 'nav.properties', adminOnly: true },
    { path: '/tasks', icon: 'bi-list-check', labelKey: 'nav.tasks', adminOnly: false },
    { path: '/staff', icon: 'bi-people-fill', labelKey: 'nav.staff', adminOnly: true },
    { path: '/notifications', icon: 'bi-bell-fill', labelKey: 'nav.notifications', adminOnly: false },
  ];

  return (
    <div id="sidebar" className="sidebar">
      <div className="logo" data-i18n="appTitle">
        Property Hub
      </div>
      <ul className="nav-menu">
        {navLinks.map(link => {
          if (link.adminOnly && !isAdmin) {
            return null; // Don't render admin links for non-admins
          }
          // A more direct check based on original logic for hiding.
          if (!isAdmin && nonAdminHiddenLinks.includes(link.path)) {
              return null;
          }
          return (
            <li key={link.path}>
              <Link to={link.path} className={isActive(link.path) ? 'active' : ''}>
                <i className={`bi ${link.icon}`}></i><span data-i18n={link.labelKey}>{link.labelKey.split('.')[1].charAt(0).toUpperCase() + link.labelKey.split('.')[1].slice(1)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default Sidebar;
