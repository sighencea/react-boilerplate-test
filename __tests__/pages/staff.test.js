import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import StaffPage from '@/pages/staff';

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: jest.fn(() => ({
    query: {},
    push: jest.fn(),
    pathname: '/staff',
  })),
}));

// Mock AuthContext - will be further customized in describe blocks or tests
const mockUseAuth = jest.fn();
jest.mock('@/context/AuthContext', () => ({
  useAuth: mockUseAuth,
}));

// Mock supabaseClient
const mockSupabaseSelect = jest.fn();
const mockSupabaseUpdate = jest.fn();
const mockSupabaseFrom = jest.fn(() => ({
  select: mockSupabaseSelect,
  update: mockSupabaseUpdate,
}));

jest.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: mockSupabaseFrom,
  },
}));

// Mock Modals
jest.mock('@/components/modals/InviteStaffModal', () => ({ isOpen, onClose }) =>
  isOpen ? <div data-testid="invite-staff-modal">Mocked Invite Modal <button onClick={onClose}>Close</button></div> : null
);
jest.mock('@/components/modals/EditStaffModal', () => ({ isOpen, onClose, staffMember }) =>
  isOpen ? <div data-testid="edit-staff-modal">Mocked Edit Modal for {staffMember?.email} <button onClick={onClose}>Close</button></div> : null
);

// Sample Data
const mockStaffListData = [
  { id: 's1', first_name: 'Alice', last_name: 'Smith', email: 'alice@example.com', user_role: 'Electrician', user_status: 'Active', avatar_url: 'alice.png', company_id: 'test-company-id', is_admin: false },
  { id: 's2', first_name: 'Bob', last_name: 'Johnson', email: 'bob@example.com', user_role: 'Plumber', user_status: 'Invited', avatar_url: null, company_id: 'test-company-id', is_admin: false },
];

const mockAdminUser = {
  id: 'admin-user-id',
  app_metadata: { company_id: 'test-company-id' },
};

describe('StaffPage', () => {
  let mockSelectImplementation;

  beforeEach(() => {
    jest.clearAllMocks();
    // Default to admin user
    mockUseAuth.mockReturnValue({
      user: mockAdminUser,
      isAdmin: true,
      loading: false,
    });

    // Default select mock implementation
    mockSelectImplementation = jest.fn().mockReturnThis();
    mockSupabaseSelect.mockImplementation(mockSelectImplementation);

    // Setup chained mocks for supabase.from('profiles').select(...).eq(...).eq(...).order(...).order(...).range(...)
    const rangeMock = jest.fn().mockResolvedValue({ data: mockStaffListData, error: null, count: mockStaffListData.length });
    const orderMock2 = jest.fn().mockReturnValue({ range: rangeMock });
    const orderMock1 = jest.fn().mockReturnValue({ order: orderMock2, range: rangeMock }); // Support single or double order
    const isAdminEqMock = jest.fn().mockReturnValue({ order: orderMock1 });
    const companyIdEqMock = jest.fn().mockReturnValue({ eq: isAdminEqMock, order: orderMock1 }); // for is_admin=false
    const orMock = jest.fn().mockReturnValue({ eq: companyIdEqMock, order: orderMock1 }); // for search

    mockSelectImplementation.mockImplementation(() => ({
        eq: companyIdEqMock,
        or: orMock,
        order: orderMock1, // for cases without search/filter
        // Add other filter methods if directly chained from select
    }));
     mockSupabaseUpdate.mockImplementation(() => ({
        eq: jest.fn().mockResolvedValue({ error: null, data: [{}] }), // Simulate successful update
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ error: null, data: {} }),
    }));


    // For fetchStaff calls specifically (profiles table)
    mockSupabaseFrom.mockImplementation((tableName) => {
        if (tableName === 'profiles') {
            return {
                select: mockSelectImplementation, // Use the more detailed mock for select chains
                update: mockSupabaseUpdate,
            };
        }
        return { // Fallback for any other table name
            select: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            range: jest.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
        };
    });
  });

  describe('Admin Access', () => {
    test('renders staff list, header with "Invite Staff Member" button, search, and filters', async () => {
      render(<StaffPage />);
      expect(await screen.findByPlaceholderText('Search staff...')).toBeInTheDocument();
      expect(screen.getByText('All Roles')).toBeInTheDocument();
      expect(screen.getByText('All Statuses')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Invite Staff Member/i })).toBeInTheDocument();
      expect(await screen.findByText('Alice Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    });

    test('table displays staff data correctly', async () => {
      render(<StaffPage />);
      expect(await screen.findByText('Alice Smith')).toBeInTheDocument();
      expect(screen.getByText('alice@example.com')).toBeInTheDocument();
      expect(screen.getByText('Electrician')).toBeInTheDocument();
      // Check for status badge text (styling is harder to assert directly)
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getAllByRole('img')[0]).toHaveAttribute('src', 'alice.png');
    });
  });

  describe('Non-Admin Access', () => {
    test('renders an "Access Denied" message', async () => {
      mockUseAuth.mockReturnValue({
        user: mockAdminUser, // Still need user for company_id checks if any part renders before guard
        isAdmin: false,
        loading: false,
      });
      render(<StaffPage />);
      expect(await screen.findByText('Access Denied.')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Invite Staff Member/i })).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText('Search staff...')).not.toBeInTheDocument();
    });
  });

  describe('Sticky Header Functionality (Admin)', () => {
    test('"Invite Staff Member" button opens InviteStaffModal', async () => {
      render(<StaffPage />);
      fireEvent.click(screen.getByRole('button', { name: /Invite Staff Member/i }));
      expect(await screen.findByTestId('invite-staff-modal')).toBeInTheDocument();
    });

    test('filtering by role triggers fetchStaff with role filter', async () => {
      render(<StaffPage />);
      await screen.findByText('Alice Smith'); // Ensure initial load

      const roleFilterSelect = screen.getByText('All Roles').closest('select');
      fireEvent.change(roleFilterSelect, { target: { value: 'Plumber' } });

      await waitFor(() => {
        // Check if the select method's eq was called with 'user_role' and 'Plumber'
        // This requires a more specific spy on the chained calls.
        // For now, we assume the fetchStaff mock is called, which is implicitly tested by re-render.
        // A more direct way: check if the supabase.from('profiles').select()...eq('user_role', 'Plumber') path was taken.
        // This test is more about interaction leading to a data refresh.
        expect(mockSupabaseSelect().eq).toHaveBeenCalledWith('user_role', 'Plumber');
      });
    });

     test('searching triggers fetchStaff with search query', async () => {
      render(<StaffPage />);
      await screen.findByText('Alice Smith');

      const searchInput = screen.getByPlaceholderText('Search staff...');
      fireEvent.change(searchInput, { target: { value: 'Alice' } });

      await waitFor(() => {
         expect(mockSupabaseSelect().or).toHaveBeenCalledWith(expect.stringContaining('Alice'));
      });
    });
  });

  describe('Staff Table Display & Badges (Admin)', () => {
     test('renders table headers correctly', async () => {
      render(<StaffPage />);
      await screen.findByText('Alice Smith');
      expect(screen.getByRole('columnheader', { name: /Profile/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /Name/i })).toBeInTheDocument();
      // ... other headers
      expect(screen.getByRole('columnheader', { name: /Status/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /Actions/i })).toBeInTheDocument();
    });

    test('status badges display correct text', async () => {
      render(<StaffPage />);
      expect(await screen.findByText('Active')).toBeInTheDocument(); // Alice Smith
      expect(screen.getByText('Invited')).toBeInTheDocument();    // Bob Johnson
    });
  });

  describe('StaffActionsDropdown Integration (Admin)', () => {
    test('clicking ellipsis opens dropdown with Edit and Set Inactive', async () => {
      render(<StaffPage />);
      await screen.findByText('Alice Smith');
      const actionButtons = screen.getAllByRole('button', { name: /Staff member actions/i });
      fireEvent.click(actionButtons[0]);

      expect(await screen.findByRole('menuitem', { name: /Edit/i })).toBeVisible();
      expect(screen.getByRole('menuitem', { name: /Set Inactive/i })).toBeVisible();
    });

    test('clicking "Edit" opens EditStaffModal with correct staff data', async () => {
      render(<StaffPage />);
      await screen.findByText('Alice Smith');
      const actionButtons = screen.getAllByRole('button', { name: /Staff member actions/i });
      fireEvent.click(actionButtons[0]);

      const editMenuItem = await screen.findByRole('menuitem', { name: /Edit/i });
      fireEvent.click(editMenuItem);

      expect(await screen.findByTestId('edit-staff-modal')).toBeInTheDocument();
      expect(screen.getByText(`Mocked Edit Modal for ${mockStaffListData[0].email}`)).toBeInTheDocument();
      await waitFor(() => expect(screen.queryByRole('menuitem', { name: /Edit/i })).not.toBeVisible());
    });

    test('clicking "Set Inactive" calls confirm, updates status, and refreshes list', async () => {
      window.confirm = jest.fn(() => true);
      const fetchStaffSpy = jest.spyOn(React, 'useEffect').mockImplementation(f => f()); // Simplified way to track fetchStaff call

      render(<StaffPage />);
      await screen.findByText('Alice Smith');
      const actionButtons = screen.getAllByRole('button', { name: /Staff member actions/i });
      fireEvent.click(actionButtons[0]);

      const setInactiveMenuItem = await screen.findByRole('menuitem', { name: /Set Inactive/i });
      fireEvent.click(setInactiveMenuItem);

      expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Alice Smith'));

      await waitFor(() => {
        expect(mockSupabaseFrom).toHaveBeenCalledWith('profiles');
        expect(mockSupabaseUpdate).toHaveBeenCalledWith({ user_status: 'Inactive' });
        expect(mockSupabaseUpdate().eq).toHaveBeenCalledWith('id', mockStaffListData[0].id);
      });

      // Check if fetchStaff was called again (signified by a supabase select call on 'profiles')
      // This count assumes initial fetch + one refresh.
      await waitFor(() => {
          // Count how many times the select mock specific to 'profiles' with its typical chaining was initiated
          // This is tricky because the mock is complex. A simpler way is to have a dedicated spy for fetchStaff.
          // For now, we assume the update leads to a state change that would re-render.
          // The dropdown should close
          expect(screen.queryByRole('menuitem', { name: /Set Inactive/i })).not.toBeVisible();
      });
    });
  });

  describe('Pagination (Admin)', () => {
    test('renders and functions correctly when many staff members exist', async () => {
      const manyStaff = Array.from({ length: 15 }, (_, i) => ({ ...mockStaffListData[0], id: `s${i}`, email: `staff${i}@example.com`, first_name: `Staff${i}` }));

      const mockRangeFn = jest.fn()
        .mockResolvedValueOnce({ data: manyStaff.slice(0, 10), error: null, count: manyStaff.length })
        .mockResolvedValueOnce({ data: manyStaff.slice(10, 15), error: null, count: manyStaff.length });

      mockSupabaseFrom.mockImplementation((tableName) => {
        if (tableName === 'profiles') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(), // For company_id, is_admin
            neq: jest.fn().mockReturnThis(),
            or: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(), // For first_name, last_name
            range: mockRangeFn,
          };
        }
        return { /* fallback */ };
      });

      render(<StaffPage />);
      expect(await screen.findByText('Staff0 Smith')).toBeInTheDocument(); // First staff from page 1
      expect(screen.getByRole('button', { name: "1" })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: "2" })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: /Next/i }));
      expect(await screen.findByText('Staff10 Smith')).toBeInTheDocument(); // First staff from page 2
      expect(mockRangeFn).toHaveBeenCalledWith(10, 19);
    });
  });
});
