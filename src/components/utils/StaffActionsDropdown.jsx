import React, { useState, useRef, useEffect } from 'react';

// SVG Icon Definitions
const IconEllipsisVertical = ({ className = "w-5 h-5" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z" />
  </svg>
);

const IconPencil = ({ className = "w-4 h-4 mr-3" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"></path><path strokeLinecap="round" strokeLinejoin="round" d="m15 5 4 4"></path>
  </svg>
);

const IconUserX = ({ className = "w-4 h-4 mr-3" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636M14.25 7.504A4.125 4.125 0 0012 6.75a4.125 4.125 0 00-2.25.754m4.5.000v.75c0 .621.504 1.125 1.125 1.125H15a1.125 1.125 0 011.125 1.125v.75m-6.75-.75v.75c0 .621-.504 1.125-1.125 1.125H6.375a1.125 1.125 0 01-1.125-1.125v-.75m9-3.75a3 3 0 00-3-3H9a3 3 0 00-3 3v.75M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);


const StaffActionsDropdown = ({ staffMember, isAdmin, onEditStaff, onDeactivateStaff }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const toggleDropdown = () => setIsOpen(!isOpen);

  const handleEdit = () => {
    onEditStaff(staffMember);
    setIsOpen(false);
  };
  const handleDeactivate = () => {
    onDeactivateStaff(staffMember); // Pass the full staffMember object as per existing handleDeleteStaff
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
        id="staff-menu-button" // Unique ID for ARIA
        onClick={toggleDropdown}
        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="Staff member actions"
      >
        <IconEllipsisVertical />
      </button>

      <div
        className={`absolute right-full mr-2 top-0 z-30 w-56 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none transform transition-all duration-100 ease-out origin-top-left ${isOpen ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`}
        role="menu"
        aria-orientation="vertical"
        aria-labelledby="staff-menu-button"
      >
        <div className="py-1" role="none">
          {isAdmin && ( // Both actions are admin only as per current staff.js logic for Edit/Deactivate
            <>
              <button
                onClick={handleEdit}
                className="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus:bg-slate-100 focus:text-slate-900 focus:outline-none rounded-md"
                role="menuitem"
              >
                <IconPencil /> Edit
              </button>
              <hr className="my-1 border-slate-200" />
              <button
                onClick={handleDeactivate}
                className="flex items-center w-full px-4 py-2 text-sm text-orange-600 hover:bg-orange-50 hover:text-orange-700 focus:bg-orange-50 focus:text-orange-700 focus:outline-none rounded-md" // Using orange for "Set Inactive"
                role="menuitem"
              >
                <IconUserX /> Set Inactive
              </button>
            </>
          )}
          {!isAdmin && (
             <p className="px-4 py-2 text-sm text-slate-500 italic">No actions available</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffActionsDropdown;
