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

  const handleOverlayClick = () => {
    document.getElementById('sidebar')?.classList.remove('active-sidebar');
    document.querySelector('.sidebar-overlay')?.classList.remove('active-sidebar');
  };

  return (
    <>
      {/* Sidebar is positioned fixed, so it's not part of this flex container directly affecting layout flow of main-content-area on mobile */}
      <Sidebar />
      {/* On md screens and up, main-content-area will have ml applied to account for the sidebar that is always visible */}
      <div className="flex flex-col flex-1 md:ml-[calc(16rem+1.5rem)]"> {/* main-content-area equivalent */}
        <TopBar /> {/* TopBar might need to span full width or be contained within this column */}
        <main className="p-3 page-content flex-1"> {/* Padding for content area, flex-1 to take available space */}
          {children}
        </main>
      </div>
      <div
        className="fixed inset-0 bg-black/50 z-40 hidden md:hidden sidebar-overlay"
        onClick={handleOverlayClick}
      ></div>

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
