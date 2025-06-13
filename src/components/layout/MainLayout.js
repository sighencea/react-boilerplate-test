import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import { useRouter } from 'next/router';

const MainLayout = ({ children }) => {
  const router = useRouter();
  const [showAccessDeniedModal, setShowAccessDeniedModal] = useState(false);

  const handleShowAccessDenied = () => setShowAccessDeniedModal(true);
  const handleCloseAccessDenied = () => setShowAccessDeniedModal(false);

  useEffect(() => {
    const eventListener = () => handleShowAccessDenied();
    window.addEventListener('show-access-denied-modal', eventListener);
    return () => {
      window.removeEventListener('show-access-denied-modal', eventListener);
    };
  }, []);

  const handleRedirectToTasks = () => {
    router.push('/tasks');
    handleCloseAccessDenied();
  };

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

      <Modal show={showAccessDeniedModal} onHide={handleCloseAccessDenied} backdrop="static" keyboard={false} centered>
        <Modal.Header> {/* No closeButton as per original data-bs-keyboard="false" and static backdrop */}
          <Modal.Title>Access Denied</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>You do not have permission to view this page.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={handleRedirectToTasks}>Go to My Tasks</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default MainLayout;
