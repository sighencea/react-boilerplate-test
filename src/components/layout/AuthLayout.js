import React, { useEffect } from 'react';
// import '../../css/style.css'; // CSS is imported globally in main.jsx

const AuthLayout = ({ children }) => {
  useEffect(() => {
    // For index.html specific styles on body
    document.body.classList.add('bg-light', 'index-page-body');
    // Conditional class for very large screens from style.css
    // This logic might need to be more React-idiomatic if it depends on window size listeners.
    const handleResize = () => {
      if (window.innerWidth >= 1921 && window.innerHeight >= 1081) {
        document.body.classList.add('index-page-body-large-screen'); // Custom class to toggle wrapper
      } else {
        document.body.classList.remove('index-page-body-large-screen');
      }
    };
    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);

    return () => {
      document.body.classList.remove('bg-light', 'index-page-body', 'index-page-body-large-screen');
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // The wrapper div logic for large screens from style.css needs to be handled.
  // For now, a simple structure. The #brandingPanel and form panel are part of the children (e.g., SignInPage).
  return (
    <div className="page-content-wrapper"> {/* This class is targeted by large screen media query */}
      <div className="container-fluid d-flex p-0">
        <div className="row g-0 w-100">
          {/* Children will typically include the branding panel and the form panel */}
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
