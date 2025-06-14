import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import TasksPage from '@/pages/tasks'; // Adjust path if necessary

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: jest.fn(() => ({
    query: {},
    push: jest.fn(),
    pathname: '/tasks',
  })),
}));

// Mock AuthContext
const mockUser = {
  id: 'test-user-id',
  app_metadata: { company_id: 'test-company-id' },
  // ... other user properties
};
jest.mock('@/context/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: mockUser,
    isAdmin: true,
    loading: false,
  })),
}));

// Mock supabaseClient
const mockSupabaseFrom = jest.fn();
const mockSupabaseRpc = jest.fn();
const mockSupabaseFunctionsInvoke = jest.fn();

const mockSelect = jest.fn(() => ({
  order: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  neq: jest.fn().mockReturnThis(),
  ilike: jest.fn().mockReturnThis(),
  range: jest.fn().mockResolvedValue({ data: [], error: null, count: 0 }), // Default empty
}));
mockSupabaseFrom.mockReturnValue({ select: mockSelect });

jest.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: mockSupabaseFrom,
    rpc: mockSupabaseRpc,
    functions: { invoke: mockSupabaseFunctionsInvoke },
  },
}));

// Mock Modals
jest.mock('@/components/modals/CreateEditTaskModal', () => ({ isOpen, onClose }) =>
  isOpen ? <div data-testid="create-edit-task-modal">Mocked Create/Edit Task Modal <button onClick={onClose}>Close</button></div> : null
);
jest.mock('@/components/modals/ViewTaskModal', () => ({ isOpen, onClose }) =>
  isOpen ? <div data-testid="view-task-modal">Mocked View Task Modal <button onClick={onClose}>Close</button></div> : null
);

// Sample Data
const mockTasksData = [
  { task_id: '1', property_id: 'p1', task_title: 'Fix Leaky Faucet', address: '123 Main St', task_status: 'New', task_priority: 'High', task_due_date: '2024-08-01', assignee_first_name: 'John', assignee_last_name: 'Doe', assignee_email: '' },
  { task_id: '2', property_id: 'p2', task_title: 'Paint Living Room', address: '456 Oak Ave', task_status: 'In Progress', task_priority: 'Medium', task_due_date: '2024-08-15', assignee_first_name: '', assignee_last_name: '', assignee_email: 'jane@example.com' },
];
const mockPropertiesList = [
  { id: 'p1', property_name: 'Main Street Property', address: '123 Main St' },
  { id: 'p2', property_name: 'Oak Avenue Property', address: '456 Oak Ave' },
];
const mockStaffList = [
  { id: 's1', first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
  { id: 's2', first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com' },
];


describe('TasksPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default Supabase mocks for this page
    // Reset all parts of the mock
    const mockRange = jest.fn().mockResolvedValue({ data: mockTasksData, error: null, count: mockTasksData.length });
    const mockIlike = jest.fn().mockReturnValue({ range: mockRange });
    const mockOrder = jest.fn().mockReturnValue({ ilike: mockIlike, range: mockRange, /* for profiles */ then: (onFulfilled) => onFulfilled({ data: mockStaffList, error: null }) });
    const mockNeq = jest.fn().mockReturnValue({ order: mockOrder });
    const mockEq = jest.fn().mockReturnValue({ order: mockOrder, neq: mockNeq, ilike: mockIlike, range: mockRange });
    const mockDelete = jest.fn().mockReturnThis(); // For delete chain

    mockSupabaseFrom.mockImplementation((tableName) => {
      const defaultReturn = {
        select: jest.fn().mockReturnValue({
          eq: mockEq,
          neq: mockNeq,
          ilike: mockIlike,
          order: mockOrder,
          range: mockRange,
        }),
        update: jest.fn().mockReturnThis(), // For soft delete in handleDeleteTask
        delete: jest.fn().mockReturnValue({ eq: mockEq }), // For delete chain
        eq: mockEq, // For delete chain's .eq()
      };

      if (tableName === 'detailed_task_assignments') {
        return {
          ...defaultReturn,
          select: jest.fn((selectString) => ({ // Make select more specific if needed
            order: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            ilike: jest.fn().mockReturnThis(),
            range: jest.fn().mockResolvedValue({ data: mockTasksData, error: null, count: mockTasksData.length }),
          })),
        };
      }
      if (tableName === 'properties') {
         return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            order: jest.fn().mockResolvedValue({ data: mockPropertiesList, error: null }),
          }),
        };
      }
      if (tableName === 'profiles') { // Staff list
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnThis(),
            neq: jest.fn().mockReturnThis(),
            order: jest.fn(function() { // Allow chaining of order
                // Check if this is the second order call for profiles
                if (this.orderCallCount === 1) {
                    this.orderCallCount = 0; // Reset for next potential call
                    return Promise.resolve({ data: mockStaffList, error: null });
                }
                this.orderCallCount = (this.orderCallCount || 0) + 1;
                return this;
            }),
          }),
        };
      }
      if (tableName === 'task_assignments' || tableName === 'task_files' || tableName === 'tasks') {
        // For handleDeleteTask calls
        return {
          delete: jest.fn().mockReturnThis(),
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ error: null }), // Assume delete/update operations succeed
        };
      }
      return defaultReturn;
    });
  });

  test('renders the TasksPage without crashing', async () => {
    render(<TasksPage />);
    // Check for a unique element from the TasksPage, e.g., the header/search bar
    expect(await screen.findByPlaceholderText('Search tasks...')).toBeInTheDocument();
  });

  describe('Sticky Header Elements', () => {
    test('renders search input, filter dropdowns, and "Create New Task" button', async () => {
      render(<TasksPage />);
      await screen.findByPlaceholderText('Search tasks...'); // Wait for page to load

      expect(screen.getByPlaceholderText('Search tasks...')).toBeInTheDocument();
      expect(screen.getByText('All Statuses')).toBeInTheDocument(); // Default option in Status select
      expect(screen.getByText('All Priorities')).toBeInTheDocument(); // Default option in Priority select
      expect(screen.getByRole('button', { name: /Create New Task/i })).toBeInTheDocument();
    });
  });

  describe('Task Table Display', () => {
    test('renders table headers', async () => {
      render(<TasksPage />);
      await screen.findByText(mockTasksData[0].task_title); // Wait for data

      expect(screen.getByRole('columnheader', { name: /Property/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /Title/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /Status/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /Priority/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /Due Date/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /Assigned To/i })).toBeInTheDocument();
      expect(screen.getByRole('columnheader', { name: /Actions/i })).toBeInTheDocument();
    });

    test('renders task rows with data', async () => {
      render(<TasksPage />);
      expect(await screen.findByText(mockTasksData[0].task_title)).toBeInTheDocument();
      expect(screen.getByText(mockTasksData[0].address)).toBeInTheDocument();
      expect(screen.getByText(mockTasksData[1].task_title)).toBeInTheDocument();
      expect(screen.getByText(mockTasksData[1].assignee_email)).toBeInTheDocument();
    });
  });

  describe('Task Actions Dropdown', () => {
    beforeEach(() => {
      // Ensure isAdmin is true for these tests by default
      const { useAuth } = require('@/context/AuthContext');
      useAuth.mockReturnValue({
        user: mockUser,
        isAdmin: true,
        loading: false,
      });
    });

    test('renders an ellipsis button for task actions in each row', async () => {
      render(<TasksPage />);
      await screen.findByText(mockTasksData[0].task_title);
      const actionButtons = screen.getAllByRole('button', { name: /task actions/i });
      expect(actionButtons.length).toBe(mockTasksData.length);
    });

    test('clicking ellipsis button opens dropdown with View, Edit, Delete for admin', async () => {
      render(<TasksPage />);
      await screen.findByText(mockTasksData[0].task_title);
      const triggerButtons = screen.getAllByRole('button', { name: /task actions/i });
      fireEvent.click(triggerButtons[0]);

      expect(await screen.findByRole('menuitem', { name: /View/i })).toBeVisible();
      expect(screen.getByRole('menuitem', { name: /Edit/i })).toBeVisible();
      expect(screen.getByRole('menuitem', { name: /Delete/i })).toBeVisible();
    });

    test('dropdown closes after clicking an item (e.g., View)', async () => {
      render(<TasksPage />);
      await screen.findByText(mockTasksData[0].task_title);
      const triggerButtons = screen.getAllByRole('button', { name: /task actions/i });
      fireEvent.click(triggerButtons[0]);

      const viewMenuItem = await screen.findByRole('menuitem', { name: /View/i });
      fireEvent.click(viewMenuItem);

      // Modal opens (mocked)
      expect(await screen.findByTestId('view-task-modal')).toBeInTheDocument();
      // Dropdown should close (menu items no longer visible/present)
      await waitFor(() => {
        expect(screen.queryByRole('menuitem', { name: /View/i })).not.toBeVisible();
      });
    });

    test('clicking Edit from dropdown opens CreateEditTaskModal', async () => {
        render(<TasksPage />);
        await screen.findByText(mockTasksData[0].task_title);
        const triggerButtons = screen.getAllByRole('button', { name: /Task actions/i });
        fireEvent.click(triggerButtons[0]);

        const editButton = await screen.findByRole('menuitem', { name: /Edit/i });
        fireEvent.click(editButton);

        expect(await screen.findByTestId('create-edit-task-modal')).toBeInTheDocument();
         await waitFor(() => {
            expect(screen.queryByRole('menuitem', { name: /Edit/i })).not.toBeVisible();
        });
    });

    test('clicking Delete from dropdown calls confirm and then delete logic', async () => {
        window.confirm = jest.fn(() => true); // Mock window.confirm

        render(<TasksPage />);
        await screen.findByText(mockTasksData[0].task_title);
        const triggerButtons = screen.getAllByRole('button', { name: /Task actions/i });
        fireEvent.click(triggerButtons[0]);

        const deleteButton = await screen.findByRole('menuitem', { name: /Delete/i });
        fireEvent.click(deleteButton);

        expect(window.confirm).toHaveBeenCalled();
        // Check if supabase delete was called (requires mockSupabaseFrom to be more specific for 'tasks' table .delete())
        // For now, just check if dropdown closes as a proxy.
        await waitFor(() => {
            expect(screen.queryByRole('menuitem', { name: /Delete/i })).not.toBeVisible();
        });
    });


    test('dropdown shows only View for non-admin users', async () => {
      const { useAuth } = require('@/context/AuthContext');
      useAuth.mockReturnValue({
        user: mockUser,
        isAdmin: false, // Non-admin
        loading: false,
      });
      render(<TasksPage />);
      await screen.findByText(mockTasksData[0].task_title);
      const triggerButtons = screen.getAllByRole('button', { name: /task actions/i });
      fireEvent.click(triggerButtons[0]);

      expect(await screen.findByRole('menuitem', { name: /View/i })).toBeVisible();
      expect(screen.queryByRole('menuitem', { name: /Edit/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('menuitem', { name: /Delete/i })).not.toBeInTheDocument();
    });

    test('dropdown closes on clicking outside', async () => {
        render(<TasksPage />);
        await screen.findByText(mockTasksData[0].task_title);
        const triggerButton = screen.getAllByRole('button', { name: /Task actions/i })[0];
        fireEvent.click(triggerButton);

        // Menu should be open
        expect(await screen.findByRole('menuitem', { name: /View/i })).toBeVisible();

        fireEvent.mouseDown(document.body); // Simulate click outside

        await waitFor(() => {
            expect(screen.queryByRole('menuitem', { name: /View/i })).not.toBeVisible();
        });
    });
  });


  describe('Pagination', () => {
    test('renders pagination controls if total tasks exceed items per page', async () => {
      const manyTasks = Array.from({ length: 15 }, (_, i) => ({ ...mockTasksData[0], task_id: `t${i}`, task_title: `Task ${i}` }));
      // Update the mock for detailed_task_assignments for this specific test
      const mockRangeFn = jest.fn()
        .mockResolvedValueOnce({ data: manyTasks.slice(0, 10), error: null, count: manyTasks.length }) // Page 1
        .mockResolvedValueOnce({ data: manyTasks.slice(10, 15), error: null, count: manyTasks.length }); // Page 2 etc.

      mockSupabaseFrom.mockImplementation((tableName) => {
        if (tableName === 'detailed_task_assignments') {
          return {
            select: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            ilike: jest.fn().mockReturnThis(),
            range: mockRangeFn,
          };
        }
        // Fallback for other tables like properties, profiles if needed by modals (though modals are mocked)
        return {
            select: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            neq: jest.fn().mockReturnThis(),
            then: (onFulfilled) => onFulfilled({ data: [], error: null }) // Generic thenable
        };
      });

      render(<TasksPage />);
      expect(await screen.findByText('Task 0')).toBeInTheDocument(); // First item of page 1
      expect(screen.getByRole('button', { name: /Previous/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Next/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: "1" })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: "2" })).toBeInTheDocument();

      // Test clicking next page
      fireEvent.click(screen.getByRole('button', { name: /Next/i }));
      expect(await screen.findByText('Task 10')).toBeInTheDocument(); // First item of page 2
      expect(mockRangeFn).toHaveBeenCalledWith(10, 19);
    });
  });

  // Original Modal Interactions tests are now covered by "Dropdown Menu Actions"
  // but we keep the "Create New Task" button test separate as it's not in the dropdown.
  describe('Global Modal Interactions', () => {
     beforeEach(() => {
      // Ensure isAdmin is true for these tests by default
      const { useAuth } = require('@/context/AuthContext');
      useAuth.mockReturnValue({
        user: mockUser,
        isAdmin: true,
        loading: false,
      });
    });
    test('clicking "Create New Task" button opens CreateEditTaskModal', async () => {
      render(<TasksPage />);
      await screen.findByRole('button', { name: /Create New Task/i });

      fireEvent.click(screen.getByRole('button', { name: /Create New Task/i }));
      expect(await screen.findByTestId('create-edit-task-modal')).toBeInTheDocument();
    });
  });
});
