import React, { forwardRef } from 'react'; // Added forwardRef
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';
import Dropdown from 'react-bootstrap/Dropdown';

const getIconForPath = (path, iconClassName) => {
  switch (path) {
    case '/dashboard':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`lucide lucide-layout-dashboard ${iconClassName}`}>
          <rect width="7" height="9" x="3" y="3" rx="1"></rect><rect width="7" height="5" x="14" y="3" rx="1"></rect><rect width="7" height="9" x="14" y="12" rx="1"></rect><rect width="7" height="5" x="3" y="16" rx="1"></rect>
        </svg>
      );
    case '/properties':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`lucide lucide-building2 ${iconClassName}`}>
          <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"></path><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"></path><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"></path><path d="M10 6h4"></path><path d="M10 10h4"></path><path d="M10 14h4"></path><path d="M10 18h4"></path>
        </svg>
      );
    case '/tasks':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`lucide lucide-clipboard-list ${iconClassName}`}>
          <rect width="8" height="4" x="8" y="2" rx="1" ry="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><path d="M12 11h4"></path><path d="M12 16h4"></path><path d="M8 11h.01"></path><path d="M8 16h.01"></path>
        </svg>
      );
    case '/staff':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`lucide lucide-users ${iconClassName}`}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      );
    case '/notifications':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`lucide lucide-bell ${iconClassName}`}>
          <path d="M10.268 21a2 2 0 0 0 3.464 0"></path><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"></path>
        </svg>
      );
    default:
      return <svg className={iconClassName} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle></svg>; // Default placeholder
  }
};

// Define CustomToggle for the Dropdown
const CustomToggle = forwardRef(({ children, onClick }, ref) => (
  <button
    ref={ref}
    onClick={(e) => {
      e.preventDefault();
      onClick(e);
    }}
    // Apply existing Tailwind classes from the button that was replaced
    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:hover:bg-accent/50 size-9 h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-200 flex-shrink-0"
    aria-label="User menu options"
  >
    {children}
  </button>
));
CustomToggle.displayName = 'CustomToggle';

const Sidebar = ({ isSidebarCollapsed, toggleSidebar }) => {
  const router = useRouter();
  const { isAdmin, loading: authLoading, user, signOut } = useAuth(); // Added signOut

  const isActive = (path) => router.pathname === path;

  const handleNavItemClick = () => {
    const sidebarEl = document.getElementById('sidebar');
    const overlayEl = document.querySelector('.sidebar-overlay');
    // Only close if it's in mobile view (i.e., it has active-sidebar, meaning it was manually opened)
    // AND if the overlay is active (which implies mobile view)
    if (sidebarEl && sidebarEl.classList.contains('active-sidebar') && overlayEl && overlayEl.classList.contains('active-sidebar')) {
      sidebarEl.classList.remove('active-sidebar');
      overlayEl.classList.remove('active-sidebar');
    }
  };

  const nonAdminHiddenLinks = [
    '/dashboard',
    '/properties',
    '/staff'
  ];

  const navLinks = [
    { path: '/dashboard', icon: 'bi-speedometer2', labelKey: 'nav.dashboard', label: 'Dashboard', adminOnly: true },
    { path: '/properties', icon: 'bi-building', labelKey: 'nav.properties', label: 'Properties', adminOnly: true },
    { path: '/tasks', icon: 'bi-list-check', labelKey: 'nav.tasks', label: 'Tasks', adminOnly: false },
    { path: '/staff', icon: 'bi-people-fill', labelKey: 'nav.staff', label: 'Staff', adminOnly: true },
    { path: '/notifications', icon: 'bi-bell-fill', labelKey: 'nav.notifications', label: 'Notifications', adminOnly: false },
  ];

  const profileUser = user || {
    name: "Alex Johnson",
    email: "alex.johnson@example.com",
    avatarUrl: "https://randomuser.me/api/portraits/men/32.jpg"
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/'); // Redirect to SignIn page
  };

  return (
    <aside
      id="sidebar"
      className={`fixed left-6 top-6 bottom-6 z-50 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-20' : 'w-64'} -translate-x-full sm:translate-x-0 border border-white/20 rounded-2xl shadow-xl shadow-black/5 bg-white/80 backdrop-blur-xl`}
    >
      <nav
        className={`h-full flex flex-col transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'p-3' : 'p-6'}`}
        aria-label="Main navigation"
      >
        <div className={`flex items-center mb-8 ${isSidebarCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-house w-4 h-4 text-white"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"></path><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path></svg>
          </div>
          {!isSidebarCollapsed && (
            <h1 className="text-xl font-bold text-slate-900">PropertyHub</h1>
          )}
        </div>

        <ul className="space-y-2 flex-1">
          {navLinks.map(link => {
            if (link.adminOnly && !isAdmin) {
              return null;
            }
            if (!isAdmin && nonAdminHiddenLinks.includes(link.path)) {
                return null;
            }

            const active = isActive(link.path);

            const baseLinkClasses = `flex items-center py-3 rounded-xl transition-all duration-200 group relative ${
              isSidebarCollapsed
                ? 'px-3 justify-center'
                : 'px-3 gap-3'
            }`;
            const activeStateSpecificClasses = "bg-blue-50 text-blue-700 font-semibold shadow-sm";
            const inactiveStateSpecificClasses = "text-slate-600 hover:bg-slate-50 hover:text-slate-900";
            const linkClassName = `${baseLinkClasses} ${active ? activeStateSpecificClasses : inactiveStateSpecificClasses}`;

            const baseIconClasses = "w-5 h-5 transition-colors flex-shrink-0"; // Added flex-shrink-0
            const activeIconStateClasses = "text-blue-600";
            const inactiveIconStateClasses = "text-slate-500 group-hover:text-slate-700";
            const iconClassName = `${baseIconClasses} ${active ? activeIconStateClasses : inactiveIconStateClasses}`;

            return (
              <li key={link.path}>
                <Link href={link.path} className={linkClassName} onClick={handleNavItemClick} aria-current={active ? 'page' : undefined}>
                  {active && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-600 rounded-r-full"></div>
                  )}
                  {getIconForPath(link.path, iconClassName)}
                  {!isSidebarCollapsed && (
                    <span className="font-medium">{link.label}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* User Profile Section - START */}
        <div className="px-3 py-4 border-t border-slate-200">
          <div className={`flex items-center group ${isSidebarCollapsed ? 'gap-0 justify-center' : 'gap-3'}`}>
            <span className="relative flex size-8 shrink-0 overflow-hidden rounded-full h-10 w-10 ring-2 ring-slate-100 transition-all duration-200 group-hover:ring-blue-200 flex-shrink-0">
              <img className="aspect-square size-full object-cover" alt={`${profileUser.name || 'User'}'s profile picture`} src={profileUser.avatarUrl || '/assets/images/placeholder-avatar.png'} />
            </span>
            <div className={`flex-1 min-w-0 ${isSidebarCollapsed ? 'w-0 overflow-hidden opacity-0' : 'opacity-100'} transition-all duration-300`}>
              <h3 className="font-semibold text-slate-900 text-sm truncate leading-tight">{profileUser.name || (user ? (user.user_metadata?.first_name || 'User') : 'Guest')}</h3>
              <p className="text-xs text-slate-500 truncate leading-relaxed mt-0.5">{user ? user.email : 'Not logged in'}</p>
            </div>
            <div className={`${isSidebarCollapsed ? 'w-0 overflow-hidden opacity-0' : 'opacity-100'} transition-opacity duration-300 flex-shrink-0`}>
              <Dropdown align="end" drop="up">
                <Dropdown.Toggle as={CustomToggle} id="sidebar-user-options">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-ellipsis-vertical h-4 w-4">
                    <circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle>
                  </svg>
                </Dropdown.Toggle>
                <Dropdown.Menu className="shadow-lg mb-2">
                  <Dropdown.Item as={Link} href="/account" legacyBehavior={false}>
                    <a className="dropdown-item flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-settings w-4 h-4"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73 2.73l-.22.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                      Account Settings
                    </a>
                  </Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item onClick={handleSignOut} className="text-danger flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-log-out w-4 h-4"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" x2="9" y1="12" y2="12"></line></svg>
                    Sign Out
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </div> {/* Correctly closing the dropdown wrapper div */}
          </div>
        </div>
        {/* User Profile Section - END */}

        {/* Help & Support / Trigger Section - START */}
        <div className={`pt-3 border-t border-slate-200 ${isSidebarCollapsed ? 'mt-auto' : ''}`}>
          <div className="flex items-center justify-between">
            <button
              className={`inline-flex items-center whitespace-nowrap text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] hover:bg-accent h-8 rounded-md gap-1.5 text-slate-600 hover:text-slate-900 ${
                isSidebarCollapsed ? 'px-1 justify-center flex-1' : 'px-3 justify-start flex-1'
              }`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`lucide lucide-circle-help w-4 h-4 flex-shrink-0 ${isSidebarCollapsed ? '' : 'mr-2'}`}>
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                <path d="M12 17h.01"></path>
              </svg>
              {!isSidebarCollapsed && (
                <span>Help & Support</span>
              )}
            </button>

            <button
              onClick={toggleSidebar}
              aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="p-2 rounded-md hover:bg-slate-200 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`w-5 h-5 text-slate-600 transition-transform duration-300 ease-in-out ${isSidebarCollapsed ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                 <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
        </div>
        {/* Help & Support / Trigger Section - END */}
      </nav>
    </aside>
  );
};

export default Sidebar;
