// js/staff-management.js
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Staff Management script loaded.');

    // Check if Supabase client is available
    if (!window._supabase) {
        console.error('Supabase client not found. Make sure it is loaded and initialized.');
        alert('Error: Supabase client not found. Staff management functionality may not work.');
        return;
    }
    const supabase = window._supabase;

    // DOM Elements
    const staffTableBody = document.getElementById('staffTableBody');
    const addNewStaffMemberBtn = document.getElementById('addNewStaffMemberBtn');
    const searchInput = document.querySelector('input[data-i18n="staffPage.filters.searchPlaceholder"]');

    // Modals
    const addStaffModalEl = document.getElementById('addStaffModal');
    const addStaffModalInstance = addStaffModalEl ? new bootstrap.Modal(addStaffModalEl) : null;
    const viewStaffModalEl = document.getElementById('viewStaffModal');
    const viewStaffModalInstance = viewStaffModalEl ? new bootstrap.Modal(viewStaffModalEl) : null;
    const editStaffModalEl = document.getElementById('editStaffModal');
    const editStaffModalInstance = editStaffModalEl ? new bootstrap.Modal(editStaffModalEl) : null;

    if (!addStaffModalInstance) {
        console.error('Add Staff Modal element not found or failed to initialize.');
    }
    if (!viewStaffModalInstance) {
        console.error('View Staff Modal element not found or failed to initialize.');
    }
    if (!editStaffModalInstance) {
        console.error('Edit Staff Modal element not found or failed to initialize.');
    }

    if (!staffTableBody) {
        console.error('Staff table body (staffTableBody) not found.');
        return;
    }
    if (!addNewStaffMemberBtn) {
        console.warn('Add New Staff Member button (addNewStaffMemberBtn) not found.');
    }
     if (!searchInput) {
        console.warn('Search input not found.');
    }

    // Placeholder for fetched staff data
    let allStaffData = [];
    let currentAdminProfile = null; // To store admin's profile

    // --- Function Definitions ---

    // Function to fetch current user's profile (including company_id)
    async function getCurrentAdminProfile() {
        console.log('getCurrentAdminProfile called');
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) {
            console.error('Error fetching user:', userError);
            throw new Error(`Error fetching user: ${userError.message}`);
        }
        if (!user) {
            throw new Error("User not authenticated. Please log in.");
        }

        const { data: profile, error: profileError } = await supabase
           .from('profiles')
           .select('company_id, preferred_ui_language, id') // id is adminUserId
           .eq('id', user.id)
           .single();

        if (profileError) {
            console.error('Error fetching admin profile:', profileError);
            throw new Error(`Error fetching admin profile: ${profileError.message}`);
        }
        if (!profile) {
            throw new Error("Admin profile not found.");
        }
        console.log('Admin profile fetched:', profile);
        return profile;
    }

    // Function to fetch staff for a company
    async function fetchStaffForCompany(companyId) { // adminUserId removed
        if (!companyId) {
            console.error('[fetchStaffForCompany] companyId is required.');
            // throw new Error('Company ID is required.'); // Or return empty array, depends on desired error handling
            return [];
        }
        if (!window._supabase) {
            console.error('[fetchStaffForCompany] Supabase client not found.');
            return [];
        }
        const supabase = window._supabase;

        console.log(`[fetchStaffForCompany] Fetching staff with task counts for companyId: ${companyId} using new RPC call.`);
        try {
            const { data, error } = await supabase.rpc(
                'get_staff_for_company_with_task_counts',
                { p_company_id: companyId } // Ensure the parameter name 'p_company_id' matches SQL function
            );

            if (error) {
                console.error('[fetchStaffForCompany] Error fetching staff with task counts:', error);
                throw error; // Re-throw to be caught by initializePage or other callers
            }

            console.log('[fetchStaffForCompany] Successfully fetched staff with task counts:', data);
            return data || []; // The RPC function should return an array of staff objects
        } catch (e) {
            console.error('[fetchStaffForCompany] Exception during RPC call:', e);
            // Return empty array or re-throw, depending on how initializePage handles errors
            // initializePage already has a try-catch that will display an error message.
            throw e;
        }
    }

    // Function to render staff data to the table
    function renderStaffTable(staffList) {
        console.log('renderStaffTable called with:', staffList);
        staffTableBody.innerHTML = ''; // Clear existing rows

        if (!staffList || staffList.length === 0) {
            staffTableBody.innerHTML = '<tr><td colspan="6" class="text-center" data-i18n="staffPage.table.noStaff">No staff members found.</td></tr>';
            // TODO: Add i18n key staffPage.table.noStaff to en.json and de.json
            // Make sure i18n is initialized and can translate this dynamically if page loads fast
            if (window.i18next && typeof window.updateUI === 'function') {
                window.updateUI(); // Attempt to translate dynamically added content
            }
            return;
        }

        staffList.forEach(staff => {
            const row = staffTableBody.insertRow();
            let statusText = staff.user_status || 'N/A';
            let statusBadgeClass = 'badge-custom-gray'; // Default

            console.log('[renderStaffTable] Processing staff:', staff.id, 'is_owner value:', staff.is_owner, 'Type:', typeof staff.is_owner);
            if (staff.is_owner) {
                console.log('[renderStaffTable] Staff member IS owner. Setting status to Owner.');
                statusText = 'Owner'; // Consider i18n: staffPage.status.owner
                statusBadgeClass = 'badge-custom-purple';
            } else {
                console.log('[renderStaffTable] Staff member is NOT owner or is_owner is not true. Proceeding with normal status.');
                if (statusText === 'Active') {
                statusBadgeClass = 'badge-custom-green';
                statusBadgeClass = 'badge-custom-green';
            } else if (statusText === 'New') {
                statusBadgeClass = 'badge-custom-blue';
            } else if (statusText === 'Invited') {
                statusBadgeClass = 'badge-custom-yellow';
            } else if (statusText === 'Inactive') {
                statusBadgeClass = 'badge-custom-gray';
            }
            }

            row.innerHTML = `
                <td class="staff-col-profile"><i class="bi bi-person-circle fa-2x text-secondary"></i></td>
                <td>${staff.first_name || ''} ${staff.last_name || ''}</td>
                <td>${staff.user_role || 'N/A'}</td>
                <td class="staff-col-assigned-tasks">${staff.assigned_tasks_count !== undefined ? staff.assigned_tasks_count : 'N/A'}</td>
                <td class="staff-col-status"><span class="badge-custom-base ${statusBadgeClass}">${statusText}</span></td>
                <td>
                    <button class="btn btn-link text-primary p-0 me-2 view-staff-btn" data-staff-id="${staff.id}" title="View Details" data-i18n="[title]staffPage.table.actions.viewDetailsTooltip"><i class="bi bi-eye-fill"></i></button>
                    <button class="btn btn-link text-warning p-0 edit-staff-btn" data-staff-id="${staff.id}" title="Edit Profile" data-i18n="[title]staffPage.table.actions.editProfileTooltip"><i class="bi bi-pencil-square"></i></button>
                </td>
            `;
        });
        // Re-apply i18n for dynamically added tooltips if necessary
        if (window.i18next && typeof window.updateUI === 'function') {
            window.updateUI();
        }
    }

    // Function to filter staff based on search input
    function filterStaff() {
        if (!searchInput) { // Guard clause if search input not present
            renderStaffTable(allStaffData); // Render all data if no search input
            return;
        }
        const searchTerm = searchInput.value.toLowerCase().trim();
        if (!allStaffData) {
            renderStaffTable([]); // Render empty if no base data
            return;
        }

        const filteredStaff = allStaffData.filter(staff => {
            const fullName = `${staff.first_name || ''} ${staff.last_name || ''}`.toLowerCase();
            const email = (staff.email || '').toLowerCase();
            const role = (staff.user_role || '').toLowerCase();
            return fullName.includes(searchTerm) || email.includes(searchTerm) || role.includes(searchTerm);
        });
        renderStaffTable(filteredStaff);
    }

    // --- Event Listeners ---
    if (addNewStaffMemberBtn && addStaffModalInstance) {
        addNewStaffMemberBtn.addEventListener('click', () => {
            console.log('Add New Staff Member button clicked');
            const addStaffForm = document.getElementById('addStaffForm');
            if (addStaffForm) addStaffForm.reset(); // Reset form before showing
            const addStaffMessage = document.getElementById('addStaffMessage');
            if (addStaffMessage) addStaffMessage.innerHTML = ''; // Clear any previous messages
            addStaffModalInstance.show();
        });
    }

    const addStaffForm = document.getElementById('addStaffForm');
    if (addStaffForm) {
        console.log('[StaffManagement] addStaffForm found, attaching submit listener.');
        addStaffForm.addEventListener('submit', handleAddStaffFormSubmit);
    } else {
        console.error('[StaffManagement] addStaffForm NOT found. Submit listener not attached.');
    }

    const editStaffForm = document.getElementById('editStaffForm');
    if (editStaffForm) {
        editStaffForm.addEventListener('submit', handleEditStaffFormSubmit);
    }

    if (searchInput) {
        searchInput.addEventListener('input', filterStaff);
    }

    const saveNewStaffButton = document.getElementById('saveNewStaffBtn');
    if (saveNewStaffButton) {
        console.log('[StaffManagement] saveNewStaffBtn found, attaching click listener.');
        saveNewStaffButton.addEventListener('click', async (e) => {
            // We prevent default because this button is type="submit".
            // If we didn't, and the form submit listener also works, the logic might run twice.
            // By calling processStaffInvitation directly, we control execution.
            e.preventDefault();
            console.log('[StaffManagement] saveNewStaffBtn clicked, calling processStaffInvitation...');
            await processStaffInvitation();
        });
    } else {
        console.error('[StaffManagement] saveNewStaffBtn NOT found. Click listener not attached.');
    }

    // Event delegation for view/edit buttons (to be implemented more robustly)
    staffTableBody.addEventListener('click', (event) => {
        const viewButton = event.target.closest('.view-staff-btn');
        const editButton = event.target.closest('.edit-staff-btn');

        if (viewButton) {
            const staffId = viewButton.dataset.staffId;
            console.log('View staff button clicked for ID:', staffId);
            const staffMember = allStaffData.find(s => s.id === staffId);

            if (staffMember && viewStaffModalInstance) {
                document.getElementById('viewStaffName').textContent = `${staffMember.first_name || ''} ${staffMember.last_name || ''}`;
                document.getElementById('viewStaffEmail').textContent = staffMember.email || 'N/A';
                document.getElementById('viewStaffRole').textContent = staffMember.user_role || 'N/A';

                const statusEl = document.getElementById('viewStaffStatus');
                let statusText = staffMember.user_status || 'N/A';
                let badgeClass = 'badge-custom-gray'; // Default

                console.log('[viewStaffModal] Processing staffMember:', staffMember.id, 'is_owner value:', staffMember.is_owner, 'Type:', typeof staffMember.is_owner);
                if (staffMember.is_owner) {
                    console.log('[viewStaffModal] Staff member IS owner for modal. Setting status to Owner.');
                    statusText = 'Owner'; // Consider i18n: staffPage.status.owner
                    badgeClass = 'badge-custom-purple';
                } else {
                    console.log('[viewStaffModal] Staff member is NOT owner or is_owner is not true for modal. Proceeding with normal status.');
                    if (statusText === 'Active') {
                    badgeClass = 'badge-custom-green';
                } else if (statusText === 'New') {
                    badgeClass = 'badge-custom-blue';
                } else if (statusText === 'Invited') {
                    badgeClass = 'badge-custom-yellow';
                } else if (statusText === 'Inactive') {
                    badgeClass = 'badge-custom-gray';
                }
                }
                statusEl.innerHTML = `<span class="badge-custom-base ${badgeClass}">${statusText}</span>`;

                document.getElementById('viewStaffAssignedTasks').textContent = staffMember.assigned_tasks_count !== undefined ? staffMember.assigned_tasks_count : 'N/A';

                viewStaffModalInstance.show();
            } else {
                console.error('Staff member not found for ID:', staffId, 'or View Modal instance not available.');
            }
        } else if (editButton) {
            const staffId = editButton.dataset.staffId;
            console.log('Edit staff button clicked for ID:', staffId);
            const staffMember = allStaffData.find(s => s.id === staffId);

            if (staffMember && editStaffModalInstance) {
                document.getElementById('editStaffId').value = staffMember.id;
                document.getElementById('editStaffFirstName').value = staffMember.first_name || '';
                document.getElementById('editStaffLastName').value = staffMember.last_name || '';
                document.getElementById('editStaffEmail').value = staffMember.email || '';
                document.getElementById('editStaffRole').value = staffMember.user_role || '';
                document.getElementById('editStaffStatus').value = staffMember.user_status || '';

                const editStaffMessage = document.getElementById('editStaffMessage');
                if (editStaffMessage) editStaffMessage.innerHTML = ''; // Clear previous messages

                editStaffModalInstance.show();
            } else {
                console.error('Staff member not found for ID:', staffId, 'or Edit Modal instance not available.');
            }
        }
    });

    // --- Helper function to display messages in modals ---
    function displayModalMessage(modalMessageElement, message, isError = false) {
        if (modalMessageElement) {
            modalMessageElement.innerHTML = `<div class="alert ${isError ? 'alert-danger' : 'alert-success'}" role="alert">${message}</div>`;
            if (window.i18next && typeof window.updateUI === 'function') window.updateUI();
        }
    }

    // --- Function to save a new staff member ---
    async function saveStaffMember(staffDataObject) {
        if (!currentAdminProfile || !currentAdminProfile.company_id) {
            console.error('Admin company information not available for saving staff.');
            // Attempt to re-fetch if not available, though ideally it should be there from init
            try {
                currentAdminProfile = await getCurrentAdminProfile();
                if (!currentAdminProfile || !currentAdminProfile.company_id) {
                     throw new Error('Admin company information could not be retrieved.');
                }
            } catch (error) {
                 throw new Error(`Admin company information could not be retrieved: ${error.message}`);
            }
        }

        const newProfile = {
            first_name: staffDataObject.firstName,
            last_name: staffDataObject.lastName,
            email: staffDataObject.email,
            user_role: staffDataObject.role,
            company_id: currentAdminProfile.company_id,
            is_admin: false,
            user_status: 'New', // Or 'Invited' if an invitation flow is implied
            preferred_ui_language: currentAdminProfile.preferred_ui_language || 'en', // Default to 'en'
        };

        const { data, error } = await supabase
            .from('profiles')
            .insert([newProfile])
            .select();

        if (error) {
            console.error('Error saving staff member:', error);
            // Check for specific errors, e.g., unique constraint violation for email
            if (error.code === '23505') { // Postgres unique violation code
                 throw new Error(`Error saving staff: An account with the email ${newProfile.email} already exists.`);
            }
            throw new Error(`Error saving staff: ${error.message}`);
        }
        console.log('Staff member saved:', data);
        return data;
    }

    // --- Function to handle Add Staff form submission ---
    async function handleAddStaffFormSubmit(event) {
        console.log('[handleAddStaffFormSubmit] Function entered via form submit.'); // Existing log
        if (event) event.preventDefault(); // Prevent default form submission
        console.log('Add Staff form submitted, calling processStaffInvitation...'); // Existing log, modified
        await processStaffInvitation();
    }

    // --- New function to process staff invitation ---
    async function processStaffInvitation() {
        console.log('[processStaffInvitation] Function entered.');
        const firstNameInput = document.getElementById('addStaffFirstName');
        const lastNameInput = document.getElementById('addStaffLastName');
        const emailInput = document.getElementById('addStaffEmail');
        const roleInput = document.getElementById('addStaffRole');
        const messageDiv = document.getElementById('addStaffMessage');
        const saveBtn = document.getElementById('saveNewStaffBtn'); // This is the button in the modal

        if (messageDiv) messageDiv.innerHTML = ''; // Clear previous messages

        const firstName = firstNameInput.value.trim();
        const lastName = lastNameInput.value.trim();
        const email = emailInput.value.trim();
        const role = roleInput.value;

        if (!firstName || !lastName || !email || !role) {
            displayModalMessage(messageDiv, 'Please fill in all required fields.', true);
            return;
        }

        if (saveBtn) saveBtn.disabled = true;

        try {
            const { data: inviteData, error: inviteError } = await supabase.functions.invoke('invite-staff-member', {
                body: {
                    email: email,
                    firstName: firstName,
                    lastName: lastName,
                    role: role
                }
            });

            if (inviteError) {
                throw new Error(inviteError.message || 'Error sending invitation. Please try again.');
            }

            displayModalMessage(messageDiv, 'Staff invitation sent successfully!', false);

            if (currentAdminProfile && currentAdminProfile.company_id) {
                allStaffData = await fetchStaffForCompany(currentAdminProfile.company_id);
                renderStaffTable(allStaffData);
            } else {
                console.warn("Admin profile not available to refresh staff list, attempting full re-initialization of list.");
                await initializePage(false);
            }

            setTimeout(() => {
                if (addStaffModalInstance) addStaffModalInstance.hide();
                // Ensure addStaffForm is accessible or get it by ID here if not in wider scope for reset
                const formToReset = document.getElementById('addStaffForm');
                if (formToReset) formToReset.reset();
                if (messageDiv) messageDiv.innerHTML = '';
            }, 1500);
        } catch (error) {
            console.error('Error during staff invitation process:', error);
            displayModalMessage(messageDiv, error.message || 'An unexpected error occurred while sending invitation.', true);
        } finally {
            if (saveBtn) saveBtn.disabled = false;
        }
    }


    // --- Function to update a staff member ---
    async function updateStaffMember(staffId, staffUpdateData) {
        console.log('Updating staff member ID:', staffId, 'with data:', staffUpdateData);
        const { error } = await supabase // Only expect error from the direct update
            .from('profiles')
            .update(staffUpdateData)
            .eq('id', staffId);

        if (error) {
            console.error('Error updating staff member (from Supabase client):', error);
            if (error.code === '23505') { // Postgres unique violation for email
                 throw new Error(`Error saving staff: An account with the email ${staffUpdateData.email} already exists.`);
            }
            // Throw a generic error that will be caught by handleEditStaffFormSubmit
            throw new Error(`Error updating staff: ${error.message}`);
        }
        // No explicit data to return, success is implied if no error was thrown
        // The calling function will check for the absence of an error.
        // console.log('Staff member update initiated (no data returned by this function).');
        // No need to log success here as it's just an update call without select.
    }

    // --- Function to handle Edit Staff form submission ---
    async function handleEditStaffFormSubmit(event) {
        event.preventDefault();
        console.log('Edit Staff form submitted');

        const staffId = document.getElementById('editStaffId').value;
        const firstName = document.getElementById('editStaffFirstName').value.trim();
        const lastName = document.getElementById('editStaffLastName').value.trim();
        const email = document.getElementById('editStaffEmail').value.trim();
        const role = document.getElementById('editStaffRole').value;
        const status = document.getElementById('editStaffStatus').value;

        const messageDiv = document.getElementById('editStaffMessage');
        const saveBtn = document.getElementById('saveStaffChangesBtn');

        if (messageDiv) messageDiv.innerHTML = '';

        if (!staffId || !firstName || !lastName || !email || !role || !status) {
            displayModalMessage(messageDiv, 'Please fill in all required fields.', true);
            return;
        }

        if (saveBtn) saveBtn.disabled = true;

        const updateData = {
            first_name: firstName,
            last_name: lastName,
            email: email,
            user_role: role,
            user_status: status,
        };

        try {
            await updateStaffMember(staffId, updateData); // No 'updatedStaff' variable needed from return

            // If updateStaffMember didn't throw, it's a success
            // Update the local allStaffData array by re-fetching
            if (currentAdminProfile && currentAdminProfile.company_id) {
                allStaffData = await fetchStaffForCompany(currentAdminProfile.company_id);
            } else {
                // Fallback or error if admin profile/company_id isn't available to refresh the list
                console.warn("Admin profile/company_id not available to refresh staff list post-update. List may be stale.");
                allStaffData = await fetchStaffForCompany(null); // Or however you fetch initially if companyId might be null
            }
            renderStaffTable(allStaffData); // Re-render the table with potentially updated data

            displayModalMessage(messageDiv, 'Staff member updated successfully!', false);
            setTimeout(() => {
                if (editStaffModalInstance) editStaffModalInstance.hide();
            }, 1500);

        } catch (error) { // This catch block was already there
            console.error('Error during staff update process:', error);
            displayModalMessage(messageDiv, error.message || 'An unexpected error occurred while updating.', true);
        } finally {
            if (saveBtn) saveBtn.disabled = false;
        }
    }

    // --- Initial Load ---
    // Allow initializePage to optionally skip re-fetching admin profile if already available
    async function initializePage(fetchAdmin = true) {
        console.log('Initializing staff page...');
        try {
            if (fetchAdmin || !currentAdminProfile) { // Fetch admin profile if requested or not available
                currentAdminProfile = await getCurrentAdminProfile();
            }

            if (currentAdminProfile && currentAdminProfile.company_id) {
                allStaffData = await fetchStaffForCompany(currentAdminProfile.company_id); // adminUserId no longer passed
                renderStaffTable(allStaffData);
            } else {
                console.error('Could not load admin profile or company ID.');
                staffTableBody.innerHTML = '<tr><td colspan="6" class="text-center" data-i18n="staffPage.table.errorLoadingAdmin">Error loading administrator data. Your company information may not be available.</td></tr>';
                if (window.i18next && typeof window.updateUI === 'function') window.updateUI();
            }
        } catch (error) {
            console.error('Error initializing page:', error.message);
            let errorMessage = error.message;
            // Customize messages based on error content if needed
            if (error.message.includes("User not authenticated")) {
                errorMessage = "You are not logged in. Please log in to view staff.";
                // Potentially redirect to login page or show login modal
            } else if (error.message.includes("Admin profile not found")) {
                 errorMessage = "Your user profile could not be loaded. Please try again or contact support.";
            } else if (error.message.includes("Error fetching staff")) {
                errorMessage = "There was an issue retrieving the staff list for your company.";
            }
            staffTableBody.innerHTML = `<tr><td colspan="6" class="text-center" data-i18n="staffPage.table.errorLoading">${errorMessage}</td></tr>`;
            if (window.i18next && typeof window.updateUI === 'function') window.updateUI();
        }
    }

    initializePage();
});
