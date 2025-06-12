import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // To ensure user is loaded, though ProtectedRoute handles auth
import { supabase } from '../supabaseClient';

const DashboardPage = () => {
  const { user } = useAuth(); // Get user to ensure calls are made in an authenticated context if RLS depends on it.

  const [propertyCount, setPropertyCount] = useState(0);
  const [taskCounts, setTaskCounts] = useState({ New: 0, 'In Progress': 0, Completed: 0 });
  const [staffCounts, setStaffCounts] = useState({ total: 0, Electrician: 0, Plumber: 0, Cleaner: 0, Contractor: 0 });

  const [loadingProps, setLoadingProps] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [loadingStaff, setLoadingStaff] = useState(true);

  const [errorProps, setErrorProps] = useState(null);
  const [errorTasks, setErrorTasks] = useState(null);
  const [errorStaff, setErrorStaff] = useState(null);

  useEffect(() => {
    // Fetch property count
    const fetchPropertyCount = async () => {
      setLoadingProps(true);
      setErrorProps(null);
      try {
        // Ensure current_user_company_id() used by RPC is available from user's session/JWT
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
        // data is expected to be an array of objects like [{status: 'New', count: 5}, ...]
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
        // data is expected to be an object like { total_staff: 10, electrician_count: 2, ... }
        if (data) {
             setStaffCounts({
                total: data.total_staff_count || 0, // ensure keys match the actual RPC output
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

    if (user) { // Only fetch if user is available (implies session is active)
        fetchPropertyCount();
        fetchTaskCounts();
        fetchStaffCounts();
    }
  }, [user]); // Re-fetch if user changes, though ProtectedRoute should handle primary auth guard

  // Welcome message - can be enhanced
  const welcomeMessage = user ? `Welcome, ${user.user_metadata?.first_name || user.email}!` : 'Welcome!';

  return (
    <>
      <div id="welcomeMessage" className="container mt-3">{welcomeMessage}</div>

      <div className="container mt-5">
        <div className="row mt-4">
          {/* Properties Card */}
          <div className="col-lg-4 col-md-6 mb-4">
            <div className="card h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="card-title mb-0" data-i18n="dashboardPage.cardProperties.title">Properties</h5>
                  {/* <Link to="/properties" className="card-link" data-i18n="dashboardPage.cardProperties.link">View Properties</Link> */}
                  {/* Replaced with simple <a> for now if Link causes issues before full page setup */}
                  <Link to="/properties" className="card-link" data-i18n="dashboardPage.cardProperties.link">View Properties</Link>

                </div>
                {loadingProps && <p data-i18n="dashboardPage.loading">Loading...</p>}
                {errorProps && <p className="text-danger" data-i18n="dashboardPage.error">Error: {errorProps}</p>}
                {!loadingProps && !errorProps && (
                  propertyCount > 0
                  ? <p className="display-4" id="propertyCount">{propertyCount}</p>
                  : <p className="card-text" data-i18n="dashboardPage.cardProperties.noProperties">You don't have any properties set up yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* Tasks Card */}
          <div className="col-lg-4 col-md-6 mb-4">
            <div className="card h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="card-title mb-0" data-i18n="dashboardPage.cardTasks.title">Tasks</h5>
                  <Link to="/tasks" className="card-link" data-i18n="dashboardPage.cardTasks.link">View Tasks</Link>
                </div>
                {loadingTasks && <p data-i18n="dashboardPage.loading">Loading...</p>}
                {errorTasks && <p className="text-danger" data-i18n="dashboardPage.error">Error: {errorTasks}</p>}
                {!loadingTasks && !errorTasks && (
                  (taskCounts.New > 0 || taskCounts['In Progress'] > 0 || taskCounts.Completed > 0) ? (
                    <div id="taskCountsContainer">
                      <p className="card-text mb-1"><span id="tasksNewCount" className="fw-bold">{taskCounts.New}</span> <small className="text-muted fw-normal" data-i18n="dashboardPage.cardTasks.statusNew">New</small></p>
                      <p className="card-text mb-1"><span id="tasksInProgressCount" className="fw-bold">{taskCounts['In Progress']}</span> <small className="text-muted fw-normal" data-i18n="dashboardPage.cardTasks.statusInProgress">In Progress</small></p>
                      <p className="card-text"><span id="tasksCompletedCount" className="fw-bold">{taskCounts.Completed}</span> <small className="text-muted fw-normal" data-i18n="dashboardPage.cardTasks.statusCompleted">Completed</small></p>
                    </div>
                  ) : (
                    <p id="noTasksMessage" className="card-text" data-i18n="dashboardPage.cardTasks.noTasks">You don't have any tasks in these categories yet.</p>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Staff Card */}
          <div className="col-lg-4 col-md-6 mb-4">
            <div className="card h-100">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="card-title mb-0" data-i18n="dashboardPage.cardStaff.title">Staff</h5>
                  <Link to="/staff" className="card-link" data-i18n="dashboardPage.cardStaff.link">View Staff</Link>
                </div>
                {loadingStaff && <p data-i18n="dashboardPage.loading">Loading...</p>}
                {errorStaff && <p className="text-danger" data-i18n="dashboardPage.error">Error: {errorStaff}</p>}
                {!loadingStaff && !errorStaff && (
                  staffCounts.total > 0 ? (
                    <>
                      <p className="display-4" id="totalStaffCount">{staffCounts.total}</p>
                      <div id="staffBreakdownContainer">
                        <p className="card-text mt-3 mb-1" data-i18n="dashboardPage.cardStaff.staffLabel" style={{ fontWeight: 'bold' }}>Staff:</p>
                        <ul style={{ listStyleType: 'none', paddingLeft: '15px', marginBottom: '0.5rem' }}>
                          <li><span id="staffElectricianCount" className="fw-bold">{staffCounts.Electrician}</span> <small className="text-muted" data-i18n="dashboardPage.cardStaff.roleElectrician">Electrician(s)</small></li>
                          <li><span id="staffPlumberCount" className="fw-bold">{staffCounts.Plumber}</span> <small className="text-muted" data-i18n="dashboardPage.cardStaff.rolePlumber">Plumber(s)</small></li>
                          <li><span id="staffCleanerCount" className="fw-bold">{staffCounts.Cleaner}</span> <small className="text-muted" data-i18n="dashboardPage.cardStaff.roleCleaner">Cleaner(s)</small></li>
                        </ul>
                        <p className="card-text mt-2 mb-1" data-i18n="dashboardPage.cardStaff.contractorsLabel" style={{ fontWeight: 'bold' }}>Contractors:</p>
                        <ul style={{ listStyleType: 'none', paddingLeft: '15px' }}>
                          <li><span id="staffContractorCount" className="fw-bold">{staffCounts.Contractor}</span> <small className="text-muted" data-i18n="dashboardPage.cardStaff.roleContractor">Contractor(s)</small></li>
                        </ul>
                      </div>
                    </>
                  ) : (
                    <p id="noStaffMessage" className="card-text" data-i18n="dashboardPage.cardStaff.noStaff">You don't have any staff members yet.</p>
                  )
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity Table - Placeholder for now, as RPC for this is not defined in PROJECT_OVERVIEW */}
        <h3 className="mt-5 mb-3" data-i18n="dashboardPage.recentActivity.title">Recent Activity</h3>
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <tbody>
              <tr>
                <td style={{ width: '60px', textAlign: 'center', verticalAlign: 'middle' }}><i className="bi bi-person-circle fa-2x text-secondary"></i></td>
                <td>System</td>
                <td data-i18n="dashboardPage.recentActivity.placeholder">Recent activity data will be shown here.</td>
                <td className="text-muted text-end" style={{ minWidth: '100px' }}>Now</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default DashboardPage;
