import React from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
// import '../../css/style.css'; // CSS is imported globally in main.jsx

const MainLayout = ({ children }) => {
  return (
    <>
      <div className="d-flex main-layout-container"> {/* Flex container for sidebar and main content */}
        <Sidebar />
        <div className="flex-grow-1 main-content-area main-content"> {/* Main content area takes remaining space, added main-content */}
          <TopBar />
          <main className="p-3 page-content"> {/* Padding for content area */}
            {children}
          </main>
        </div>
      </div>
      <div className="sidebar-overlay d-lg-none"></div> {/* Kept outside main flex layout for now */}

      {/* Access Denied Modal (Kept outside main flex layout for now) */}
      <div className="modal fade" id="accessDeniedModal" tabIndex="-1" aria-labelledby="accessDeniedModalLabel" aria-hidden="true" data-bs-backdrop="static" data-bs-keyboard="false">
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="accessDeniedModalLabel">Access Denied</h5>
            </div>
            <div className="modal-body">
              <p>You do not have permission to view this page.</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-primary" id="redirectToTasksBtn">Go to My Tasks</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MainLayout;
