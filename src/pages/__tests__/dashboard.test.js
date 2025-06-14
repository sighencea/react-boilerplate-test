import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import DashboardPage from '../dashboard'; // Adjust path as necessary

// Mock next/router
jest.mock('next/router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    pathname: '/dashboard',
    // Add any other router properties your component uses
  })),
}));

// Mock AuthContext
jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      user_metadata: { first_name: 'TestUser' },
    },
    isAdmin: true, // Assuming admin for full feature visibility, adjust if needed
    loading: false,
  })),
}));

// Mock supabaseClient
const mockRpc = jest.fn();
jest.mock('../../lib/supabaseClient', () => ({
  supabase: {
    rpc: mockRpc,
    // Mock other Supabase functions if your component uses them directly
  },
}));

// Mock data for Supabase RPC calls
const mockPropertyCount = 5;
const mockTaskCounts = { New: 2, 'In Progress': 3, Completed: 10 };
const mockStaffCounts = { total: 8, Electrician: 2, Plumber: 3, Cleaner: 2, Contractor: 1 };

describe('DashboardPage', () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockRpc.mockReset();
    // Setup default mock implementations for RPC calls
    mockRpc.mockImplementation((rpcName) => {
      if (rpcName === 'get_company_property_count') {
        return Promise.resolve({ data: mockPropertyCount, error: null });
      }
      if (rpcName === 'get_company_task_counts_by_status') {
        return Promise.resolve({ data: [
          { status: 'New', count: mockTaskCounts.New },
          { status: 'In Progress', count: mockTaskCounts['In Progress'] },
          { status: 'Completed', count: mockTaskCounts.Completed },
        ], error: null });
      }
      if (rpcName === 'get_company_staff_counts_by_role') {
        return Promise.resolve({ data: {
            total_staff_count: mockStaffCounts.total,
            electrician_count: mockStaffCounts.Electrician,
            plumber_count: mockStaffCounts.Plumber,
            cleaner_count: mockStaffCounts.Cleaner,
            contractor_count: mockStaffCounts.Contractor,
          }, error: null });
      }
      return Promise.resolve({ data: null, error: { message: 'Unknown RPC' } });
    });
  });

  test('renders the dashboard page without crashing', async () => {
    render(<DashboardPage />);
    // Check for a welcome message or a unique element to confirm render
    expect(await screen.findByText(/Welcome, TestUser!/i)).toBeInTheDocument();
  });

  describe('Sticky Header', () => {
    test('renders the sticky header with search bar and filter buttons', async () => {
      render(<DashboardPage />);
      const header = screen.getByRole('banner'); // The <header> element
      expect(header).toBeInTheDocument();

      // Check for search bar (disabled)
      const searchInput = within(header).getByPlaceholderText('Search dashboard...');
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toBeDisabled();

      // Check for filter button (disabled)
      const filterButton = within(header).getByRole('button', { name: /Filter/i });
      expect(filterButton).toBeInTheDocument();
      expect(filterButton).toBeDisabled();
    });
  });

  describe('Summary Cards', () => {
    const cards = [
      { title: 'Properties', href: '/properties', dataTestId: 'dashboardPage.cardProperties.title' },
      { title: 'Tasks', href: '/tasks', dataTestId: 'dashboardPage.cardTasks.title' },
      { title: 'Staff', href: '/staff', dataTestId: 'dashboardPage.cardStaff.title' },
    ];

    test('renders all three summary cards', async () => {
      render(<DashboardPage />);
      for (const card of cards) {
        // Wait for the card title to appear (data is fetched asynchronously)
        expect(await screen.findByText(card.title, { exact: false })).toBeInTheDocument();
      }
    });

    cards.forEach((cardInfo) => {
      describe(`${cardInfo.title} Card`, () => {
        test(`displays the title "${cardInfo.title}"`, async () => {
          render(<DashboardPage />);
          const cardTitleElement = await screen.findByText(cardInfo.title, { selector: 'h5' });
          expect(cardTitleElement).toBeInTheDocument();
        });

        test('contains its specific icon and a chevron icon', async () => {
          render(<DashboardPage />);
          const cardTitleElement = await screen.findByText(cardInfo.title, { selector: 'h5' });
          const cardElement = cardTitleElement.closest('a'); // The whole card is a link
          expect(cardElement).not.toBeNull();

          // Check for an SVG element (icon) within the card, near the title
          // This is a basic check; more specific checks might need data-testid on icons
          const svgs = within(cardElement).getAllByRole('img', { hidden: true }); // SVGs are often img role
          expect(svgs.length).toBeGreaterThanOrEqual(2); // Main icon + Chevron

          // Check for chevron specifically (path d="m9 18 6-6-6-6")
          const chevron = cardElement.querySelector('svg > path[d="m9 18 6-6-6-6"]');
          expect(chevron).toBeInTheDocument();
        });

        test(`is a clickable link to ${cardInfo.href}`, async () => {
          render(<DashboardPage />);
          const cardTitleElement = await screen.findByText(cardInfo.title, { selector: 'h5' });
          const linkElement = cardTitleElement.closest('a');
          expect(linkElement).toHaveAttribute('href', cardInfo.href);
        });
      });
    });

    // Test data rendering after mocks resolve
    test('displays property count', async () => {
        render(<DashboardPage />);
        expect(await screen.findByText(mockPropertyCount.toString())).toBeInTheDocument();
    });

    test('displays task counts', async () => {
        render(<DashboardPage />);
        expect(await screen.findByText(mockTaskCounts.New.toString())).toBeInTheDocument();
        expect(screen.getByText('New', { selector: 'span' })).toBeInTheDocument(); // Check for the label "New"
        expect(await screen.findByText(mockTaskCounts['In Progress'].toString())).toBeInTheDocument();
        expect(screen.getByText('In Progress', { selector: 'span' })).toBeInTheDocument();
        expect(await screen.findByText(mockTaskCounts.Completed.toString())).toBeInTheDocument();
        expect(screen.getByText('Completed', { selector: 'span' })).toBeInTheDocument();
    });

    test('displays staff counts', async () => {
        render(<DashboardPage />);
        expect(await screen.findByText(mockStaffCounts.total.toString())).toBeInTheDocument();
        expect(await screen.findByText(mockStaffCounts.Electrician.toString())).toBeInTheDocument();
        // Add more specific checks for staff roles if necessary
    });

  });

  describe('Recent Activity Section', () => {
    test('renders the "Recent Activity" heading and table', async () => {
      render(<DashboardPage />);
      expect(await screen.findByRole('heading', { name: /Recent Activity/i })).toBeInTheDocument();
      expect(screen.getByRole('table')).toBeInTheDocument();
      // Check for table headers
      expect(screen.getByText('Source', { selector: 'th' })).toBeInTheDocument();
      expect(screen.getByText('Activity', { selector: 'th' })).toBeInTheDocument();
      expect(screen.getByText('Time', { selector: 'th' })).toBeInTheDocument();
    });
  });
});
