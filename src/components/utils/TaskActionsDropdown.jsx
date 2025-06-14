import React, { useState, useRef, useEffect } from 'react';

// SVG Icon Definitions
const IconEllipsisVertical = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
  </svg>
);

const IconEye = ({ className = "w-4 h-4 mr-2" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const IconPencil = ({ className = "w-4 h-4 mr-2" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path><path strokeLinecap="round" strokeLinejoin="round" d="m15 5 4 4"></path>
  </svg>
);

const IconTrash = ({ className = "w-4 h-4 mr-2" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18"></path><path strokeLinecap="round" strokeLinejoin="round" d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path strokeLinecap="round" strokeLinejoin="round" d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line>
  </svg>
);

const TaskActionsDropdown = ({ task, isAdmin, onView, onEdit, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleView = () => {
    onView(task);
    setIsOpen(false);
  };
  const handleEdit = () => {
    onEdit(task);
    setIsOpen(false);
  };
  const handleDelete = () => {
    onDelete(task.task_id); // Assuming onDelete takes task_id
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, dropdownRef]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        id="menu-button" // Added id
        onClick={toggleDropdown}
        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500" // Refined styling
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="Task actions"
      >
        <IconEllipsisVertical />
      </button>

      <div // This div is now always rendered for transitions
        className={`absolute right-full mr-2 top-0 z-30 w-56 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none transform transition-all duration-100 ease-out origin-top-left ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
        role="menu"
        aria-orientation="vertical"
        aria-labelledby="menu-button"
      >
        <div className="py-1" role="none"> {/* Inner div for padding and menu item grouping */}
          <button
            onClick={handleView}
            className="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus:bg-slate-100 focus:text-slate-900 focus:outline-none rounded-md"
            role="menuitem"
          >
            <IconEye className="w-4 h-4 mr-3" /> View
          </button>
          {isAdmin && (
            <>
              <button
                onClick={handleEdit}
                className="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus:bg-slate-100 focus:text-slate-900 focus:outline-none rounded-md"
                role="menuitem"
              >
                <IconPencil className="w-4 h-4 mr-3" /> Edit
              </button>
              <hr className="my-1 border-slate-200" /> {/* Corrected divider styling */}
              <button
                onClick={handleDelete}
                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 focus:bg-red-50 focus:text-red-700 focus:outline-none rounded-md"
                role="menuitem"
              >
                <IconTrash className="w-4 h-4 mr-3" /> Delete
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskActionsDropdown;
