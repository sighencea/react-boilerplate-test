import React from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
// import '../../css/style.css'; // CSS is imported globally in main.jsx

const MainLayout = ({ children }) => {
  return (
    <>
      <Sidebar />
      <div id="mainContent" className="main-content">
        <TopBar />
        <div id="pageSpecificContent"> {/* Content will be passed as children */}
          {children}
        </div>
      </div>
      <div className="sidebar-overlay d-lg-none"></div> {/* From dashboard.html */}

      {/* Access Denied Modal (Example, will need proper component later) */}
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
