import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import { supabase } from '@/lib/supabaseClient';

// Import getIconForPath from Sidebar.js or define it locally if it's simple enough
// For this example, let's assume a simplified local version or direct SVG for brevity
// In a real scenario, you'd import: import { getIconForPath } from '../components/layout/Sidebar';

// Simplified getIconForPath for dashboard cards - In a real app, import from Sidebar.js
const getIconForPath = (path, iconClassName) => {
  switch (path) {
    case '/properties':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClassName}>
          <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"></path><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"></path><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"></path><path d="M10 6h4"></path><path d="M10 10h4"></path><path d="M10 14h4"></path><path d="M10 18h4"></path>
        </svg>
      );
    case '/tasks':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClassName}>
          <rect width="8" height="4" x="8" y="2" rx="1" ry="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><path d="M12 11h4"></path><path d="M12 16h4"></path><path d="M8 11h.01"></path><path d="M8 16h.01"></path>
        </svg>
      );
    case '/staff':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClassName}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
        </svg>
      );
    default: // Fallback icon
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClassName}>
          <circle cx="12" cy="12" r="10"></circle>
        </svg>
      );
  }
};

const ChevronRightIcon = ({ className }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
);


const DashboardPage = () => {
  const { user } = useAuth();

  const [propertyCount, setPropertyCount] = useState(0);
  const [taskCounts, setTaskCounts] = useState({ New: 0, 'In Progress': 0, Completed: 0 });
  const [staffCounts, setStaffCounts] = useState({ total: 0, Electrician: 0, Plumber: 0, Cleaner: 0, Contractor: 0 });

  const [loadingProps, setLoadingProps] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [loadingStaff, setLoadingStaff] = useState(true);

  const [errorProps, setErrorProps] = useState(null);
  const [errorTasks, setErrorTasks] = useState(null);
  const [errorStaff, setErrorStaff] = useState(null);

  // Search and filter states (currently not used for functionality)
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Fetch property count
    const fetchPropertyCount = async () => {
      setLoadingProps(true);
      setErrorProps(null);
      try {
        const { data, error } = await supabase.rpc('get_company_property_count');
        if (error) throw error;
        setPropertyCount(data);
      } catch (err) {
        console.error('Error fetching property count:', err);
        setErrorProps(err.message);
      } finally {
        setLoadingProps(false);
      }
    };

    // Fetch task counts
    const fetchTaskCounts = async () => {
      setLoadingTasks(true);
      setErrorTasks(null);
      try {
        const { data, error } = await supabase.rpc('get_company_task_counts_by_status');
        if (error) throw error;
        const counts = { New: 0, 'In Progress': 0, Completed: 0 };
        if (data) {
            data.forEach(item => {
                if (item.status in counts) {
                    counts[item.status] = item.count;
                }
            });
        }
        setTaskCounts(counts);
      } catch (err) {
        console.error('Error fetching task counts:', err);
        setErrorTasks(err.message);
      } finally {
        setLoadingTasks(false);
      }
    };

    // Fetch staff counts
    const fetchStaffCounts = async () => {
      setLoadingStaff(true);
      setErrorStaff(null);
      try {
        const { data, error } = await supabase.rpc('get_company_staff_counts_by_role');
        if (error) throw error;
        if (data) {
             setStaffCounts({
                total: data.total_staff_count || 0,
                Electrician: data.electrician_count || 0,
                Plumber: data.plumber_count || 0,
                Cleaner: data.cleaner_count || 0,
                Contractor: data.contractor_count || 0,
            });
        } else {
             setStaffCounts({ total: 0, Electrician: 0, Plumber: 0, Cleaner: 0, Contractor: 0 });
        }
      } catch (err) {
        console.error('Error fetching staff counts:', err);
        setErrorStaff(err.message);
      } finally {
        setLoadingStaff(false);
      }
    };

    if (user) {
        fetchPropertyCount();
        fetchTaskCounts();
        fetchStaffCounts();
    }
  }, [user]);

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
    // Future: Trigger search/filter actions
  };

  const welcomeMessage = user ? `Welcome, ${user.user_metadata?.first_name || user.email}!` : 'Welcome!';

  return (
    <>
      {/* Sticky Header */}
      <header className="sticky top-6 z-40 mx-6 mb-8">
        <div className="backdrop-blur-xl bg-white/80 border border-white/20 rounded-2xl shadow-xl shadow-black/5 p-6">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="flex items-center flex-1 max-w-md border border-slate-200 rounded-md bg-white/60 shadow-xs h-9 transition-colors focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/50">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="lucide lucide-search w-4 h-4 text-slate-400 mx-2 flex-shrink-0"
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <path d="m21 21-4.3-4.3"></path>
                </svg>
                <input
                  type="text"
                  className="h-full flex-1 min-w-0 bg-transparent px-2 py-1 text-base md:text-sm placeholder:text-muted-foreground focus:outline-none disabled:pointer-events-none disabled:cursor-not-allowed file:text-foreground selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:text-sm file:font-medium"
                  placeholder="Search dashboard..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  disabled // Disabled for now
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => console.log('Filter clicked')} // No action for now
                  disabled // Disabled for now
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-xl border border-slate-200 bg-white/60 px-3 py-2 text-sm font-medium text-slate-700 ring-offset-background transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 gap-1.5"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-filter w-4 h-4">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                  </svg>
                  Filter
                </button>
                {/* Optional: View mode buttons if needed in dashboard, for now, kept similar to properties */}
                <div className="flex rounded-lg border border-slate-200 bg-white/60 p-1">
                  <button
                    onClick={() => console.log('Grid view clicked')} // No action
                    disabled // Disabled for now
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-700 ring-offset-background transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-slate-100"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-layout-grid w-4 h-4">
                      <rect width="7" height="7" x="3" y="3" rx="1"></rect><rect width="7" height="7" x="14" y="3" rx="1"></rect><rect width="7" height="7" x="14" y="14" rx="1"></rect><rect width="7" height="7" x="3" y="14" rx="1"></rect>
                    </svg>
                  </button>
                  <button
                    onClick={() => console.log('List view clicked')} // No action
                    disabled // Disabled for now
                    className="inline-flex items-center justify-center whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-700 ring-offset-background transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-list w-4 h-4">
                      <line x1="8" x2="21" y1="6" y2="6"></line><line x1="8" x2="21" y1="12" y2="12"></line><line x1="8" x2="21" y1="18" y2="18"></line><line x1="3" x2="3.01" y1="6" y2="6"></line><line x1="3" x2="3.01" y1="12" y2="12"></line><line x1="3" x2="3.01" y1="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            {/* Optional: Add button or other actions specific to dashboard */}
          </div>
        </div>
      </header>

      <div id="welcomeMessage" className="px-6 mb-4 text-lg">{welcomeMessage}</div>

      {/* Main content area with Tailwind grid */}
      <section className="px-6 pb-12">
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {/* Properties Card - Refined Design */}
          <Link href="/properties" className="group text-card-foreground flex flex-col rounded-xl overflow-hidden border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <div className="p-6 flex flex-col flex-grow"> {/* Consistent padding */}
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  {getIconForPath('/properties', 'w-6 h-6 text-blue-600 group-hover:text-blue-700 transition-colors')}
                  <h5 className="text-xl font-bold text-slate-900 group-hover:text-blue-700 transition-colors" data-i18n="dashboardPage.cardProperties.title">Properties</h5>
                </div>
                <ChevronRightIcon className="w-5 h-5 text-slate-400 group-hover:text-blue-700 transition-colors transform group-hover:translate-x-1 duration-300" />
              </div>
              <div className="flex-grow mt-2"> {/* Added mt-2 for spacing between header and content */}
                {loadingProps && <p data-i18n="dashboardPage.loading" className="text-sm text-slate-500">Loading...</p>}
                {errorProps && <p className="text-sm text-red-500" data-i18n="dashboardPage.error">Error: {errorProps}</p>}
                {!loadingProps && !errorProps && (
                  propertyCount > 0
                  ? <p className="text-4xl font-bold text-slate-800" id="propertyCount">{propertyCount}</p>
                  : <p className="text-sm text-slate-600" data-i18n="dashboardPage.cardProperties.noProperties">You don't have any properties set up yet.</p>
                )}
              </div>
            </div>
          </Link>

          {/* Tasks Card - Refined Design */}
          <Link href="/tasks" className="group text-card-foreground flex flex-col rounded-xl overflow-hidden border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <div className="p-6 flex flex-col flex-grow">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  {getIconForPath('/tasks', 'w-6 h-6 text-blue-600 group-hover:text-blue-700 transition-colors')}
                  <h5 className="text-xl font-bold text-slate-900 group-hover:text-blue-700 transition-colors" data-i18n="dashboardPage.cardTasks.title">Tasks</h5>
                </div>
                <ChevronRightIcon className="w-5 h-5 text-slate-400 group-hover:text-blue-700 transition-colors transform group-hover:translate-x-1 duration-300" />
              </div>
              <div className="flex-grow mt-2"> {/* Added mt-2 for spacing */}
                {loadingTasks && <p data-i18n="dashboardPage.loading" className="text-sm text-slate-500">Loading...</p>}
                {errorTasks && <p className="text-sm text-red-500" data-i18n="dashboardPage.error">Error: {errorTasks}</p>}
                {!loadingTasks && !errorTasks && (
                  (taskCounts.New > 0 || taskCounts['In Progress'] > 0 || taskCounts.Completed > 0) ? (
                    <div id="taskCountsContainer" className="space-y-1.5"> {/* Slightly increased space */}
                      <p className="text-sm text-slate-700"><span className="font-medium text-slate-800">{taskCounts.New}</span> <span className="text-slate-600" data-i18n="dashboardPage.cardTasks.statusNew">New</span></p>
                      <p className="text-sm text-slate-700"><span className="font-medium text-slate-800">{taskCounts['In Progress']}</span> <span className="text-slate-600" data-i18n="dashboardPage.cardTasks.statusInProgress">In Progress</span></p>
                      <p className="text-sm text-slate-700"><span className="font-medium text-slate-800">{taskCounts.Completed}</span> <span className="text-slate-600" data-i18n="dashboardPage.cardTasks.statusCompleted">Completed</span></p>
                    </div>
                  ) : (
                    <p id="noTasksMessage" className="text-sm text-slate-600" data-i18n="dashboardPage.cardTasks.noTasks">You don't have any tasks in these categories yet.</p>
                  )
                )}
              </div>
            </div>
          </Link>

          {/* Staff Card - Refined Design */}
          <Link href="/staff" className="group text-card-foreground flex flex-col rounded-xl overflow-hidden border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <div className="p-6 flex flex-col flex-grow">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  {getIconForPath('/staff', 'w-6 h-6 text-blue-600 group-hover:text-blue-700 transition-colors')}
                  <h5 className="text-xl font-bold text-slate-900 group-hover:text-blue-700 transition-colors" data-i18n="dashboardPage.cardStaff.title">Staff</h5>
                </div>
                <ChevronRightIcon className="w-5 h-5 text-slate-400 group-hover:text-blue-700 transition-colors transform group-hover:translate-x-1 duration-300" />
              </div>
              <div className="flex-grow mt-2"> {/* Added mt-2 for spacing */}
                {loadingStaff && <p data-i18n="dashboardPage.loading" className="text-sm text-slate-500">Loading...</p>}
                {errorStaff && <p className="text-sm text-red-500" data-i18n="dashboardPage.error">Error: {errorStaff}</p>}
                {!loadingStaff && !errorStaff && (
                  staffCounts.total > 0 ? (
                    <>
                      <p className="text-4xl font-bold text-slate-800" id="totalStaffCount">{staffCounts.total}</p>
                      <div id="staffBreakdownContainer" className="text-sm space-y-1.5 mt-2"> {/* Slightly increased space & consistent mt-2 */}
                        <div>
                          <p className="font-medium text-slate-700" data-i18n="dashboardPage.cardStaff.staffLabel">Staff:</p> {/* Changed from font-semibold */}
                          <ul className="list-disc list-inside pl-2 text-slate-600">
                            <li><span className="font-medium text-slate-800">{staffCounts.Electrician}</span> <span data-i18n="dashboardPage.cardStaff.roleElectrician">Electrician(s)</span></li>
                            <li><span className="font-medium text-slate-800">{staffCounts.Plumber}</span> <span data-i18n="dashboardPage.cardStaff.rolePlumber">Plumber(s)</span></li>
                            <li><span className="font-medium text-slate-800">{staffCounts.Cleaner}</span> <span data-i18n="dashboardPage.cardStaff.roleCleaner">Cleaner(s)</span></li>
                          </ul>
                        </div>
                        <div>
                          <p className="font-medium text-slate-700" data-i18n="dashboardPage.cardStaff.contractorsLabel">Contractors:</p> {/* Changed from font-semibold */}
                          <ul className="list-disc list-inside pl-2 text-slate-600">
                            <li><span className="font-medium text-slate-800">{staffCounts.Contractor}</span> <span data-i18n="dashboardPage.cardStaff.roleContractor">Contractor(s)</span></li>
                          </ul>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p id="noStaffMessage" className="text-sm text-slate-600" data-i18n="dashboardPage.cardStaff.noStaff">You don't have any staff members yet.</p>
                  )
                )}
              </div>
            </div>
          </Link>
        </div>

        {/* Recent Activity Table - Refined Styling */}
        <h3 className="mt-10 mb-4 text-xl font-semibold text-slate-900" data-i18n="dashboardPage.recentActivity.title">Recent Activity</h3> {/* Adjusted margin bottom */}
        <div className="overflow-x-auto bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border-0"> {/* Removed border-white/20 to match card style (border-0) */}
          <table className="min-w-full text-sm text-left"> {/* Removed text-slate-500 for more specific control below */}
            <thead className="text-xs text-slate-700 uppercase bg-slate-50/70"> {/* Slightly more transparent header */}
              <tr>
                <th scope="col" className="px-6 py-3 w-16"> {/* Icon column */} </th>
                <th scope="col" className="px-6 py-3 font-medium">Source</th> {/* Standardized padding & font-medium */}
                <th scope="col" className="px-6 py-3 font-medium">Activity</th>
                <th scope="col" className="px-6 py-3 font-medium text-right">Time</th>
              </tr>
            </thead>
            <tbody>
              {/* Example Row - This should be dynamically generated in a real app */}
              <tr className="bg-white/90 border-b border-slate-200/80 hover:bg-slate-50/90 transition-colors duration-150"> {/* More subtle border, bg transparency */}
                <td className="px-6 py-4 text-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-user-circle w-5 h-5 text-slate-400 mx-auto"> {/* Adjusted size for table context */}
                    <circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="10" r="3"></circle><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"></path></svg>
                </td>
                <td className="px-6 py-4 font-medium text-slate-800 whitespace-nowrap">System</td>
                <td className="px-6 py-4 text-slate-600">Recent activity data will be shown here.</td>
                <td className="px-6 py-4 text-slate-500 text-right whitespace-nowrap">Now</td>
              </tr>
              {/* Add more rows as needed, e.g., a slightly different row for visual variety if desired */}
              <tr className="bg-white/90 border-b border-slate-200/80 hover:bg-slate-50/90 transition-colors duration-150">
                <td className="px-6 py-4 text-center">
                   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-check w-5 h-5 text-slate-400 mx-auto"><path d="M15.5 2H8.6c-.4 0-.8.2-1.1.5-.3.3-.5.7-.5 1.1V14c0 .4.2.8.5 1.1.3.3.7.5 1.1.5h1.8c-.1.2-.1.4-.1.6v.8c0 .4.1.7.3.9.2.2.5.4.9.4h.2c.3 0 .6-.1.8-.4.2-.2.3-.5.3-.9v-.5c0-.3.1-.5.1-.7h1.8c.4 0 .8-.2 1.1-.5.3-.3.5-.7.5-1.1V6.5L15.5 2z"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="m9 15.5 2 2 4-4"></path></svg>
                </td>
                <td className="px-6 py-4 font-medium text-slate-800 whitespace-nowrap">User Action</td>
                <td className="px-6 py-4 text-slate-600">A new property "Sunset Villa" was added.</td>
                <td className="px-6 py-4 text-slate-500 text-right whitespace-nowrap">10 min ago</td>
              </tr>
               <tr className="bg-white/90 hover:bg-slate-50/90 transition-colors duration-150"> {/* Last row no bottom border */}
                <td className="px-6 py-4 text-center">
                   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-alert-triangle w-5 h-5 text-amber-500 mx-auto"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg>
                </td>
                <td className="px-6 py-4 font-medium text-slate-800 whitespace-nowrap">System Alert</td>
                <td className="px-6 py-4 text-slate-600">Task "Fix Leaky Faucet" is overdue.</td>
                <td className="px-6 py-4 text-slate-500 text-right whitespace-nowrap">1 hour ago</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
};

export default DashboardPage;
