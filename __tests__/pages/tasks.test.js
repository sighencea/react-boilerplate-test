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
    mockSupabaseFrom.mockImplementation((tableName) => {
      if (tableName === 'detailed_task_assignments') {
        return {
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          ilike: jest.fn().mockReturnThis(),
          range: jest.fn().mockResolvedValue({ data: mockTasksData, error: null, count: mockTasksData.length }),
        };
      }
      if (tableName === 'properties') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: mockPropertiesList, error: null }),
        };
      }
      if (tableName === 'profiles') {
         return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          neq: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(), // Chain order calls
          mockResolvedValueOnce: jest.fn().mockResolvedValue({ data: mockStaffList, error: null }), // Ensure this is how chained orders are handled or simplify mock
        };
      }
      return { // Default fallback for any other table
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
      };
    });

    // Specific mock for staff list fetch due to multiple order calls
    const staffQueryMock = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      order: jest.fn().mockImplementation(() => staffQueryMock), // Return self for chaining
      mockResolvedValue: jest.fn().mockResolvedValue({ data: mockStaffList, error: null }) // Final call
    };
    // Override for 'profiles' to use the more specific mock that handles chained 'order'
     mockSupabaseFrom.mockImplementation((tableName) => {
      if (tableName === 'detailed_task_assignments') {
        // Keep existing detailed_task_assignments mock
         return {
          select: jest.fn((selectString) => ({
            order: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            ilike: jest.fn().mockReturnThis(),
            range: jest.fn().mockResolvedValue({ data: mockTasksData, error: null, count: mockTasksData.length }),
          })),
        };
      }
      if (tableName === 'properties') {
        // Keep existing properties mock
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: mockPropertiesList, error: null }),
        };
      }
      if (tableName === 'profiles') {
        // Use a more robust mock for profiles that can handle chained calls better
        const profilesMock = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          neq: jest.fn().mockReturnThis(),
          order: jest.fn(function() { // Use function to allow 'this'
            // Simulate that the final chained call resolves
            if (this.isFinalCall) { // Add a way to mark the final call or check call count
                 return Promise.resolve({ data: mockStaffList, error: null });
            }
            this.isFinalCall = true; // Example: mark after first order
            return this;
          }),
        };
         // A simpler approach if chained order doesn't need specific field checks:
         const simpleProfilesMock = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            neq: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(), // Just return self for all orders
         };
         // And then ensure the final method in the chain resolves the value:
         simpleProfilesMock.order.mockReturnValueOnce(simpleProfilesMock).mockResolvedValueOnce({ data: mockStaffList, error: null });
         // This is still tricky. For simplicity in tests, often the direct data is mocked.
         // Let's simplify: assume the chained calls ultimately resolve to the mock data.
         // The mockSupabaseFrom.mockReturnValue({ select: mockSelect }); structure is better.
         // We will rely on the default mock for 'profiles' and ensure 'range' or final call resolves.
         // For now, the default mock structure handles 'profiles' generically.
         // We will adjust the mockSelect to handle profiles specifically if needed.
        return { // Fallback to a generic structure that allows chaining and final resolution
            select: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            neq: jest.fn().mockReturnThis(),
            ilike: jest.fn().mockReturnThis(),
            // For profiles, the final call isn't 'range', it's just the end of the chain.
            // We need to ensure that the mock for 'profiles' resolves correctly.
            // This part is tricky due to the chained nature.
            // A common pattern is to mock the final method in the chain.
            // If `order` is the last call for profiles, it should resolve.
             then: jest.fn((onFulfilled) => onFulfilled({ data: mockStaffList, error: null })) // Make it thenable
        };
      }
      // Default fallback for other tables
      return {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        ilike: jest.fn().mockReturnThis(),
        range: jest.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
      };
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
      expect(screen.getByText(mockTasksData[1].assignee_email)).toBeInTheDocument(); // Email shown if name missing
    });

    test('renders View, Edit, and Delete action buttons for each task', async () => {
      render(<TasksPage />);
      await screen.findByText(mockTasksData[0].task_title);

      const rows = screen.getAllByRole('row');
      // Starting from rows[1] to skip header row
      mockTasksData.forEach((task, index) => {
        const currentRow = rows[index + 1];
        expect(within(currentRow).getByRole('button', { name: /View task/i })).toBeInTheDocument();
        expect(within(currentRow).getByRole('button', { name: /Edit task/i })).toBeInTheDocument();
        expect(within(currentRow).getByRole('button', { name: /Delete task/i })).toBeInTheDocument();
      });
    });
  });

  describe('Pagination', () => {
    test('renders pagination controls if total tasks exceed items per page', async () => {
      // Mock tasks to exceed ITEMS_PER_PAGE (10)
      const manyTasks = Array.from({ length: 15 }, (_, i) => ({ ...mockTasksData[0], task_id: `t${i}`, task_title: `Task ${i}` }));
      mockSupabaseFrom.mockImplementation((tableName) => {
        if (tableName === 'detailed_task_assignments') {
          return {
            select: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            ilike: jest.fn().mockReturnThis(),
            range: jest.fn().mockResolvedValueOnce({ data: manyTasks.slice(0, 10), error: null, count: manyTasks.length }) // First page
                       .mockResolvedValueOnce({ data: manyTasks.slice(10,15), error: null, count: manyTasks.length }), // Second page
          };
        }
         return { /* mocks for other tables if needed */ };
      });

      render(<TasksPage />);
      expect(await screen.findByText('Task 0')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Previous/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Next/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: "1" })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: "2" })).toBeInTheDocument();
    });
  });

  describe('Modal Interactions', () => {
    test('clicking "Create New Task" button opens CreateEditTaskModal', async () => {
      render(<TasksPage />);
      await screen.findByRole('button', { name: /Create New Task/i }); // Ensure page loaded

      fireEvent.click(screen.getByRole('button', { name: /Create New Task/i }));
      expect(await screen.findByTestId('create-edit-task-modal')).toBeInTheDocument();
    });

    test('clicking "View" button on a task row opens ViewTaskModal', async () => {
      render(<TasksPage />);
      await screen.findByText(mockTasksData[0].task_title); // Wait for tasks to load

      const viewButtons = screen.getAllByRole('button', { name: /View task/i });
      fireEvent.click(viewButtons[0]);
      expect(await screen.findByTestId('view-task-modal')).toBeInTheDocument();
    });
  });
});
