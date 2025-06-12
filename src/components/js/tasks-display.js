// Global modal instances
let viewTaskModalInstance = null;
let editTaskModalInstance = null;
let filesToDeleteInEditModal = []; // For managing files marked for deletion in edit modal
let addNewTaskModalInstance = null;

// Asynchronous function to fetch current user's profile (especially admin status)
async function getCurrentUserProfile() {
  if (!window._supabase) {
    console.error('Supabase client is not available.');
    return null;
  }
  const { data: { user }, error: userError } = await window._supabase.auth.getUser();

  if (userError || !user) {
    console.error('Error fetching user or no user logged in:', userError);
    return null;
  }

  // Now fetch the profile for this user
  try {
    const { data: profile, error: profileError } = await window._supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return null;
    }
    return profile; // Expected to be an object like { is_admin: true/false } or null
  } catch (e) {
    console.error('Exception while fetching user profile:', e);
    return null;
  }
}

// Function to populate dropdowns in the Create Task Modal
async function populateCreateTaskModalDropdowns() {
  const supabase = window._supabase;
  const saveNewTaskButton = document.getElementById('saveNewTaskBtn'); // Get save button reference

  // Helper to update dropdown and disable save button on error
  const setDropdownError = (selectElement, message) => {
    selectElement.innerHTML = `<option value="" selected disabled>${message}</option>`;
    selectElement.disabled = true;
    if (saveNewTaskButton) saveNewTaskButton.disabled = true;
  };

  // Helper to reset/enable save button
  const enableSaveButton = () => {
    if (saveNewTaskButton) saveNewTaskButton.disabled = false;
  };

  // Disable save button initially
  if (saveNewTaskButton) saveNewTaskButton.disabled = true;

  if (!supabase) {
    console.error('Supabase client is not available.');
    // Potentially update UI to inform user
    return;
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    console.error('Error fetching user or no user logged in:', userError);
    // Potentially update UI
    return;
  }

  const propertySelect = document.getElementById('taskPropertySelect');
  const staffSelect = document.getElementById('taskStaffSelect');

  if (!propertySelect || !staffSelect) {
    console.error('Property or Staff select dropdown not found.');
    return;
  }

  // Reset dropdowns to "Loading..."
  propertySelect.innerHTML = '<option value="" selected disabled>Loading properties...</option>';
  propertySelect.disabled = true;
  staffSelect.innerHTML = '<option value="" selected disabled>Loading staff...</option>';
  staffSelect.disabled = true;

  try {
    // Get company_id for the admin user
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .select('id')
      .eq('owner_id', user.id)
      .single();

    if (companyError || !companyData) {
      console.error('Error fetching company for admin or admin not linked to a company:', companyError);
      setDropdownError(propertySelect, 'Error loading properties (admin company issue).');
      setDropdownError(staffSelect, 'Error loading staff (admin company issue).');
      return;
    }
    const adminCompanyId = companyData.id;

    // Fetch properties
    const { data: properties, error: propertiesError } = await supabase
      .from('properties')
      .select('id, property_name')
      .eq('company_id', adminCompanyId);

    if (propertiesError) {
      console.error('Error fetching properties:', propertiesError);
      setDropdownError(propertySelect, `Error: ${propertiesError.message}`);
    } else if (properties && properties.length > 0) {
      propertySelect.innerHTML = '<option value="" selected disabled>Select a property</option>';
      properties.forEach(prop => {
        const option = document.createElement('option');
        option.value = prop.id;
        option.textContent = prop.property_name;
        propertySelect.appendChild(option);
      });
      propertySelect.disabled = false;
    } else {
      setDropdownError(propertySelect, 'No properties found for your company.');
    }

    // Fetch staff members
    let staffMembers = [];
    const { data: companyStaff, error: staffError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, company_id') // Select company_id for verification
      .eq('company_id', adminCompanyId);

    if (staffError) {
      console.error('Error fetching staff members:', staffError);
      setDropdownError(staffSelect, `Error: ${staffError.message}`);
      // If properties loaded, save button might still be enabled by property logic.
      // So, ensure it's disabled if staff loading fails critically.
      if (saveNewTaskButton) saveNewTaskButton.disabled = true;
    } else {
      staffMembers = companyStaff || [];
    }

    // Fetch the admin's own profile to ensure they can be assigned
    const { data: adminProfile, error: adminProfileError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, company_id')
      .eq('id', user.id)
      .single();

    if (adminProfileError) {
      console.error("Error fetching admin's profile:", adminProfileError);
    } else if (adminProfile) {
      if (adminProfile.company_id === adminCompanyId) {
        const isAdminAlreadyInList = staffMembers.some(staff => staff.id === adminProfile.id);
        if (!isAdminAlreadyInList) {
          staffMembers.push({
            id: adminProfile.id,
            first_name: adminProfile.first_name,
            last_name: adminProfile.last_name
          });
        }
      } else {
         console.warn(`Admin's profile company_id (${adminProfile.company_id}) does not match the managed company_id (${adminCompanyId}). Admin will not be added to staff list based on this check.`);
      }
    }

    const uniqueStaffMap = new Map();
    staffMembers.forEach(staff => uniqueStaffMap.set(staff.id, staff));
    const uniqueStaffMembers = Array.from(uniqueStaffMap.values());

    if (uniqueStaffMembers.length > 0) {
      staffSelect.innerHTML = '<option value="" selected disabled>Assign to staff</option>';
      uniqueStaffMembers.forEach(staff => {
        const option = document.createElement('option');
        option.value = staff.id;
        option.textContent = `${staff.first_name || ''} ${staff.last_name || ''}`.trim() || 'Unnamed Staff';
        staffSelect.appendChild(option);
      });
      staffSelect.disabled = false;
    } else if (!staffError) {
      setDropdownError(staffSelect, 'No staff found for your company (or admin profile mismatch).');
    }

    if (!propertySelect.disabled && !staffSelect.disabled) {
      enableSaveButton();
    } else {
      if (saveNewTaskButton) saveNewTaskButton.disabled = true;
    }

  } catch (error) {
    console.error('General error in populateCreateTaskModalDropdowns:', error);
    setDropdownError(propertySelect, 'Failed to load data.');
    setDropdownError(staffSelect, 'Failed to load data.');
    if (saveNewTaskButton) saveNewTaskButton.disabled = true;
  }
}

async function fetchSingleTaskDetails(taskId) {
  if (!window._supabase) {
    console.error("Supabase client is not available.");
    throw new Error("Supabase client not available.");
  }
  if (!taskId) {
    console.error("Task ID is required to fetch details.");
    throw new Error("Task ID is required.");
  }

  // Fetch main task data, property, and assignees
  const { data: taskData, error: taskError } = await window._supabase
    .from('tasks')
    .select(`
      *,
      properties ( property_name ),
      detailed_task_assignments ( assignee_first_name, assignee_last_name, assignee_user_id, assignee_email )
    `)
    .eq('task_id', taskId)
    .single();

  if (taskError) {
    console.error(`Error fetching task details for ${taskId}:`, taskError);
    throw taskError;
  }
  if (!taskData) {
    throw new Error("Task not found.");
  }

  // Fetch related files (non-deleted)
  const { data: filesData, error: filesError } = await window._supabase
    .from('task_files')
    .select('id, file_name, mime_type, storage_path') // Add other fields if needed for display
    .eq('task_id', taskId)
    .eq('is_deleted', false);

  if (filesError) {
    console.error(`Error fetching files for task ${taskId}:`, filesError);
    // Not throwing error here, task details can still be shown
    taskData.files = [];
  } else {
    taskData.files = filesData || [];
  }

  return taskData;
}

// Asynchronous function to fetch tasks and related data from Supabase
async function fetchTasksAndRelatedData() {
  if (!window._supabase) {
    console.error("Supabase client is not available.");
    const tasksTableBody = document.getElementById('tasksTableBody');
    if (tasksTableBody) {
      tasksTableBody.innerHTML = '<tr><td colspan="6">Error: Could not connect to the database. Please try again later.</td></tr>';
    }
    return [];
  }

  try {
    const { data: fetchedTasks, error } = await window._supabase
      .from('tasks')
      .select(`
        task_id,
        task_title,
        task_status,
        task_due_date,
        property_id,
        properties ( property_name ),
        detailed_task_assignments ( assignee_first_name, assignee_last_name, assignee_user_id, assignee_email )
      `);

    if (error) {
      console.error("Error fetching tasks:", error);
      const tasksTableBody = document.getElementById('tasksTableBody');
      if (tasksTableBody) {
        tasksTableBody.innerHTML = `<tr><td colspan="6">Error fetching tasks: ${error.message}</td></tr>`;
      }
      return [];
    }

    if (!fetchedTasks) {
      return [];
    }

    const mappedTasks = fetchedTasks.map(task => {
      let assignedToText = 'Unassigned';
      if (task.detailed_task_assignments && task.detailed_task_assignments.length > 0) {
          const firstAssignment = task.detailed_task_assignments[0];

          if (firstAssignment && (firstAssignment.assignee_first_name || firstAssignment.assignee_last_name)) {
              assignedToText = `${firstAssignment.assignee_first_name || ''} ${firstAssignment.assignee_last_name || ''}`.trim();
              if (!assignedToText) {
                  assignedToText = 'Unnamed Assignee';
              }
              const uniqueAssigneeIds = new Set(task.detailed_task_assignments.map(asn => asn.assignee_user_id));
              if (uniqueAssigneeIds.size > 1) {
                  assignedToText += ` (+${uniqueAssigneeIds.size - 1} more)`;
              }
          } else if (firstAssignment) {
               assignedToText = 'Unnamed Assignee'; // Assignee exists but names are blank
          } else {
              assignedToText = 'Assignee(s) (Details Hidden)';
          }
      }

      return {
        id: task.task_id,
        title: task.task_title,
        property: task.properties ? task.properties.property_name : 'N/A',
        assignedTo: assignedToText,
        status: task.task_status, // Keep original status for logic
        dueDate: task.task_due_date
      };
    });

    return mappedTasks;

  } catch (e) {
    console.error("Exception while fetching tasks:", e);
    const tasksTableBody = document.getElementById('tasksTableBody');
    if (tasksTableBody) {
      tasksTableBody.innerHTML = `<tr><td colspan="6">An unexpected error occurred: ${e.message}</td></tr>`;
    }
    return [];
  }
}

// Function to format ISO date string to dd/MMM/yyyy
function formatDate(isoDate) {
  if (!isoDate) return 'N/A';
  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) {
        const dateWithTime = new Date(isoDate + 'T00:00:00');
        if(isNaN(dateWithTime.getTime())) {
            console.error("Invalid date value:", isoDate);
            return 'Invalid Date';
        }
        const day = String(dateWithTime.getUTCDate()).padStart(2, '0');
        const month = dateWithTime.toLocaleString('default', { month: 'short', timeZone: 'UTC' }).toUpperCase();
        const year = dateWithTime.getUTCFullYear();
        return `${day}/${month}/${year}`;
    }

    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = date.toLocaleString('default', { month: 'short', timeZone: 'UTC' }).toUpperCase();
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error("Error formatting date:", isoDate, error);
    return 'Invalid Date';
  }
}

// Function to render tasks into the table
function renderTasks(tasks) {
  const tasksTableBody = document.getElementById('tasksTableBody');
  if (!tasksTableBody) {
    console.error("Tasks table body not found!");
    return;
  }

  tasksTableBody.innerHTML = '';

  if (tasks.length === 0) {
    tasksTableBody.innerHTML = '<tr><td colspan="6">No tasks found.</td></tr>';
    return;
  }

  tasks.forEach(task => {
    const tr = document.createElement('tr');
    tr.setAttribute('data-task-id', task.id);

    const tdTitle = document.createElement('td');
    tdTitle.textContent = task.title || 'N/A';
    tr.appendChild(tdTitle);

    const tdProperty = document.createElement('td');
    tdProperty.textContent = task.property || 'N/A';
    tr.appendChild(tdProperty);

    const tdAssignedTo = document.createElement('td');
    tdAssignedTo.textContent = task.assignedTo || 'N/A';
    tr.appendChild(tdAssignedTo);

    const tdStatus = document.createElement('td');
    const statusSpan = document.createElement('span');
    statusSpan.classList.add('badge-custom-base');
    let statusText = task.status || 'N/A'; // Default text

    const lowerCaseStatus = (task.status || '').toLowerCase();

    switch (lowerCaseStatus) {
      case 'new':
        statusSpan.classList.add('badge-custom-blue');
        statusText = 'New';
        break;
      case 'not started':
        statusSpan.style.cssText = "background-color: #F1F3F4; color: #666666;";
        statusText = 'Not started';
        break;
      case 'in progress':
        statusSpan.classList.add('badge-custom-yellow');
        statusText = 'In progress';
        break;
      case 'completed':
      case 'done':
        statusSpan.classList.add('badge-custom-green');
        statusText = 'Done';
        break;
      case 'cancelled':
        statusSpan.classList.add('badge-custom-red');
        statusText = 'Cancelled';
        break;
      default:
        statusText = task.status || 'N/A';
        break;
    }
    statusSpan.textContent = statusText;
    tdStatus.appendChild(statusSpan);
    tr.appendChild(tdStatus);

    const tdDueDate = document.createElement('td');
    tdDueDate.textContent = formatDate(task.dueDate);
    tr.appendChild(tdDueDate);

    const tdActions = document.createElement('td');

    const viewButton = document.createElement('button');
    viewButton.className = 'btn btn-sm btn-info me-1 view-task-btn';
    viewButton.innerHTML = '<i class="bi bi-eye"></i>';
    viewButton.setAttribute('data-task-id', task.id);
    viewButton.setAttribute('aria-label', 'View Task');
    tdActions.appendChild(viewButton);

    const editButton = document.createElement('button');
    editButton.className = 'btn btn-sm btn-warning edit-task-btn';
    editButton.innerHTML = '<i class="bi bi-pencil"></i>';
    editButton.setAttribute('data-task-id', task.id);
    editButton.setAttribute('aria-label', 'Edit Task');
    tdActions.appendChild(editButton);

    tr.appendChild(tdActions);
    tasksTableBody.appendChild(tr);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  if (document.getElementById('viewTaskModal')) {
    viewTaskModalInstance = new bootstrap.Modal(document.getElementById('viewTaskModal'));
  }
  if (document.getElementById('editTaskModal')) {
    editTaskModalInstance = new bootstrap.Modal(document.getElementById('editTaskModal'));
  }
  const addNewTaskModalEl = document.getElementById('addNewTaskModal');
  if (addNewTaskModalEl) {
    addNewTaskModalInstance = new bootstrap.Modal(addNewTaskModalEl);
  }

  try {
    const userProfile = await getCurrentUserProfile();
    const isAdmin = userProfile ? userProfile.is_admin : false;
    console.log('User isAdmin status:', isAdmin);

    const staffFilterContainer = document.getElementById('staffFilterContainer');
    const addNewTaskBtnContainer = document.getElementById('addNewTaskBtnContainer');
    const addNewTaskBtn = document.getElementById('addNewTaskBtn');

    if (isAdmin) {
      if (staffFilterContainer) {
        staffFilterContainer.classList.remove('d-none');
      }
      if (addNewTaskBtnContainer) {
        addNewTaskBtnContainer.classList.remove('d-none');
      }
      if (addNewTaskBtn && addNewTaskModalInstance) {
        addNewTaskBtn.addEventListener('click', async function() {
          try {
            await populateCreateTaskModalDropdowns();
          } catch (error) {
            console.error("Error populating create task modal dropdowns:", error);
          }
          addNewTaskModalInstance.show();
        });
      }
    }

    const tasks = await fetchTasksAndRelatedData();
    renderTasks(tasks);
  } catch (error) {
    console.error('Error during page initialization, user profile fetching, or task fetching:', error);
    const tasksTableBody = document.getElementById('tasksTableBody');
    if (tasksTableBody) {
      tasksTableBody.innerHTML = `<tr><td colspan="6">Failed to load tasks. Error: ${error.message}</td></tr>`;
    } else {
      alert("Failed to load tasks. Please check the console for more details.");
    }
  }

  const tasksTableBody = document.getElementById('tasksTableBody');
  if (tasksTableBody) {
    tasksTableBody.addEventListener('click', function(event) {
      const viewTarget = event.target.closest('.view-task-btn');
      if (viewTarget && viewTaskModalInstance) {
        const taskId = viewTarget.getAttribute('data-task-id');
        const modalBody = document.getElementById('viewTaskModalBody');
        const modalTitle = document.getElementById('viewTaskModalLabel'); // Assuming the title ID is this

        // Reset to loading state
        if (modalTitle) modalTitle.textContent = 'View Task Details';
        if (modalBody) {
            // Quickly set loading state for all fields
            document.getElementById('viewTaskTitle').textContent = 'Loading...';
            document.getElementById('viewTaskProperty').textContent = 'Loading...';
            document.getElementById('viewTaskAssignees').textContent = 'Loading...';
            document.getElementById('viewTaskStatus').textContent = 'Loading...';
            document.getElementById('viewTaskPriority').textContent = 'Loading...';
            document.getElementById('viewTaskDueDate').textContent = 'Loading...';
            document.getElementById('viewTaskDescription').textContent = 'Loading...';
            document.getElementById('viewTaskNotes').textContent = 'Loading...';
            document.getElementById('viewTaskImagesList').innerHTML = '<li class="list-group-item text-muted">Loading...</li>';
            document.getElementById('viewTaskDocumentsList').innerHTML = '<li class="list-group-item text-muted">Loading...</li>';
            document.getElementById('viewTaskCreatedAt').textContent = 'Loading...';
            document.getElementById('viewTaskUpdatedAt').textContent = 'Loading...';
        }
        viewTaskModalInstance.show(); // Show modal immediately with loading state

        fetchSingleTaskDetails(taskId).then(taskDetails => {
          if (modalTitle) modalTitle.textContent = `Task: ${taskDetails.task_title || 'Details'}`;

          document.getElementById('viewTaskTitle').textContent = taskDetails.task_title || 'N/A';
          document.getElementById('viewTaskProperty').textContent = taskDetails.properties ? taskDetails.properties.property_name : 'N/A';

          let assigneesText = 'Unassigned';
          if (taskDetails.detailed_task_assignments && taskDetails.detailed_task_assignments.length > 0) {
            assigneesText = taskDetails.detailed_task_assignments
              .map(a => `${a.assignee_first_name || ''} ${a.assignee_last_name || ''}`.trim() || 'Unnamed Assignee')
              .join(', ');
          }
          document.getElementById('viewTaskAssignees').textContent = assigneesText;

          document.getElementById('viewTaskStatus').textContent = taskDetails.task_status || 'N/A';
          document.getElementById('viewTaskPriority').textContent = taskDetails.task_priority || 'N/A';
          document.getElementById('viewTaskDueDate').textContent = taskDetails.task_due_date ? formatDate(taskDetails.task_due_date) : 'N/A'; // Assuming formatDate exists
          document.getElementById('viewTaskDescription').textContent = taskDetails.task_description || 'N/A';
          document.getElementById('viewTaskNotes').textContent = taskDetails.task_notes || 'No notes yet.';

          document.getElementById('viewTaskCreatedAt').textContent = taskDetails.task_created_at ? formatDate(taskDetails.task_created_at) : 'N/A';
          document.getElementById('viewTaskUpdatedAt').textContent = taskDetails.task_updated_at ? formatDate(taskDetails.task_updated_at) : 'N/A';

          const imagesList = document.getElementById('viewTaskImagesList');
          imagesList.innerHTML = ''; // Clear loading/previous
          const imageFiles = taskDetails.files.filter(f => f.mime_type && f.mime_type.startsWith('image/'));
          if (imageFiles.length > 0) {
            imageFiles.forEach(file => {
              const li = document.createElement('li');
              li.className = 'list-group-item';
              li.textContent = file.file_name; // Placeholder: actual link/thumbnail later
              imagesList.appendChild(li);
            });
          } else {
            imagesList.innerHTML = '<li class="list-group-item text-muted">No images attached.</li>';
          }

          const documentsList = document.getElementById('viewTaskDocumentsList');
          documentsList.innerHTML = ''; // Clear loading/previous
          const docFiles = taskDetails.files.filter(f => f.mime_type && !f.mime_type.startsWith('image/'));
          if (docFiles.length > 0) {
            docFiles.forEach(file => {
              const li = document.createElement('li');
              li.className = 'list-group-item';
              li.textContent = file.file_name; // Placeholder: actual link later
              documentsList.appendChild(li);
            });
          } else {
            documentsList.innerHTML = '<li class="list-group-item text-muted">No documents attached.</li>';
          }

        }).catch(error => {
          if (modalBody) modalBody.innerHTML = `<p class="text-danger">Error loading task details: ${error.message}</p>`;
        });
      }

      const editTarget = event.target.closest('.edit-task-btn');
      if (editTarget && editTaskModalInstance) {
        const taskId = editTarget.getAttribute('data-task-id');
        const editTaskForm = document.getElementById('editTaskForm');
        const messageDiv = document.getElementById('editTaskMessage');

        if (editTaskForm) editTaskForm.reset();
        if (messageDiv) messageDiv.innerHTML = '';
        filesToDeleteInEditModal = []; // Clear the array when modal is opened

        // Set loading states
        document.getElementById('editTaskId').value = '';
        document.getElementById('editTaskTitle').value = 'Loading...';
        document.getElementById('editTaskDescription').value = 'Loading...';
        document.getElementById('editTaskPropertyDisplay').textContent = 'Loading...';
        document.getElementById('editTaskAssigneeSelect').innerHTML = '<option value="">Loading staff...</option>';
        document.getElementById('editTaskStatusSelect').value = '';
        document.getElementById('editTaskPrioritySelect').value = '';
        document.getElementById('editTaskDueDateInput').value = '';
        document.getElementById('editTaskNotesTextarea').value = 'Loading...';
        document.getElementById('editTaskExistingImagesList').innerHTML = '<small class="text-muted">Loading...</small>';
        document.getElementById('editTaskExistingDocumentsList').innerHTML = '<small class="text-muted">Loading...</small>';

        editTaskModalInstance.show();

        fetchSingleTaskDetails(taskId).then(taskDetails => {
          document.getElementById('editTaskId').value = taskDetails.task_id;
          document.getElementById('editTaskTitle').value = taskDetails.task_title || '';
          document.getElementById('editTaskDescription').value = taskDetails.task_description || '';
          document.getElementById('editTaskPropertyDisplay').textContent = taskDetails.properties ? taskDetails.properties.property_name : 'N/A';

          let assigneesText = 'Unassigned';
          if (taskDetails.detailed_task_assignments && taskDetails.detailed_task_assignments.length > 0) {
            assigneesText = taskDetails.detailed_task_assignments
              .map(a => `${a.assignee_first_name || ''} ${a.assignee_last_name || ''}`.trim() || 'Unnamed Assignee')
              .join(', ');
          }
          // Placeholder for assignee dropdown. Full population is a future task.
          // For now, it shows current assignee or "Unassigned". A real dropdown would need options.
          const assigneeSelect = document.getElementById('editTaskAssigneeSelect');
          assigneeSelect.innerHTML = `<option value="${taskDetails.detailed_task_assignments && taskDetails.detailed_task_assignments.length > 0 ? taskDetails.detailed_task_assignments[0].assignee_user_id : ''}" selected>${assigneesText} (Re-assignment UI later)</option>`;


          document.getElementById('editTaskStatusSelect').value = taskDetails.task_status || 'New';
          document.getElementById('editTaskPrioritySelect').value = taskDetails.task_priority || 'Medium';
          document.getElementById('editTaskDueDateInput').value = taskDetails.task_due_date ? taskDetails.task_due_date.split('T')[0] : ''; // Format YYYY-MM-DD for date input
          document.getElementById('editTaskNotesTextarea').value = taskDetails.task_notes || '';

          const imagesList = document.getElementById('editTaskExistingImagesList');
          imagesList.innerHTML = ''; // Clear loading
          const imageFiles = taskDetails.files.filter(f => f.mime_type && f.mime_type.startsWith('image/'));
          if (imageFiles.length > 0) {
            imageFiles.forEach(file => {
              const li = document.createElement('li');
              li.className = 'list-group-item d-flex justify-content-between align-items-center';
              li.setAttribute('id', `file-item-${file.id}`); // Add ID for easy access

              const fileNameSpan = document.createElement('span');
              fileNameSpan.textContent = file.file_name;
              li.appendChild(fileNameSpan);

              const deleteBtn = document.createElement('button');
              deleteBtn.type = 'button';
              deleteBtn.className = 'btn btn-sm btn-outline-danger delete-task-file-btn';
              deleteBtn.setAttribute('data-file-id', file.id);
              deleteBtn.setAttribute('data-file-name', file.file_name); // Store filename for undo
              deleteBtn.innerHTML = '<i class="bi bi-trash"></i> Delete';

              deleteBtn.addEventListener('click', function() {
                const fileId = this.dataset.fileId;
                const listItem = document.getElementById(`file-item-${fileId}`);
                const fileNameSpanInItem = listItem.querySelector('span');

                if (filesToDeleteInEditModal.includes(fileId)) {
                  // Undo deletion
                  filesToDeleteInEditModal = filesToDeleteInEditModal.filter(id => id !== fileId);
                  if (fileNameSpanInItem) fileNameSpanInItem.style.textDecoration = 'none';
                  listItem.style.opacity = '1';
                  this.innerHTML = '<i class="bi bi-trash"></i> Delete';
                  this.classList.remove('btn-success');
                  this.classList.add('btn-outline-danger');
                } else {
                  // Mark for deletion
                  filesToDeleteInEditModal.push(fileId);
                  if (fileNameSpanInItem) fileNameSpanInItem.style.textDecoration = 'line-through';
                  listItem.style.opacity = '0.6';
                  this.innerHTML = '<i class="bi bi-arrow-counterclockwise"></i> Undo';
                  this.classList.remove('btn-outline-danger');
                  this.classList.add('btn-success');
                }
              });
              li.appendChild(deleteBtn);
              imagesList.appendChild(li);
            });
          } else {
            imagesList.innerHTML = '<small class="text-muted">No images currently attached.</small>';
          }

          const documentsList = document.getElementById('editTaskExistingDocumentsList');
          documentsList.innerHTML = ''; // Clear loading
          const docFiles = taskDetails.files.filter(f => f.mime_type && !f.mime_type.startsWith('image/'));
          if (docFiles.length > 0) {
            docFiles.forEach(file => {
              const li = document.createElement('li');
              li.className = 'list-group-item d-flex justify-content-between align-items-center';
              li.setAttribute('id', `file-item-${file.id}`); // Add ID for easy access

              const fileNameSpan = document.createElement('span');
              fileNameSpan.textContent = file.file_name;
              li.appendChild(fileNameSpan);

              const deleteBtn = document.createElement('button');
              deleteBtn.type = 'button';
              deleteBtn.className = 'btn btn-sm btn-outline-danger delete-task-file-btn';
              deleteBtn.setAttribute('data-file-id', file.id);
              deleteBtn.setAttribute('data-file-name', file.file_name); // Store filename for undo
              deleteBtn.innerHTML = '<i class="bi bi-trash"></i> Delete';

              deleteBtn.addEventListener('click', function() {
                const fileId = this.dataset.fileId;
                const listItem = document.getElementById(`file-item-${fileId}`);
                const fileNameSpanInItem = listItem.querySelector('span');

                if (filesToDeleteInEditModal.includes(fileId)) {
                  // Undo deletion
                  filesToDeleteInEditModal = filesToDeleteInEditModal.filter(id => id !== fileId);
                   if (fileNameSpanInItem) fileNameSpanInItem.style.textDecoration = 'none';
                  listItem.style.opacity = '1';
                  this.innerHTML = '<i class="bi bi-trash"></i> Delete';
                  this.classList.remove('btn-success');
                  this.classList.add('btn-outline-danger');
                } else {
                  // Mark for deletion
                  filesToDeleteInEditModal.push(fileId);
                  if (fileNameSpanInItem) fileNameSpanInItem.style.textDecoration = 'line-through';
                  listItem.style.opacity = '0.6';
                  this.innerHTML = '<i class="bi bi-arrow-counterclockwise"></i> Undo';
                  this.classList.remove('btn-outline-danger');
                  this.classList.add('btn-success');
                }
              });
              li.appendChild(deleteBtn);
              documentsList.appendChild(li);
            });
          } else {
            documentsList.innerHTML = '<small class="text-muted">No documents currently attached.</small>';
          }

        }).catch(error => {
          console.error('Error fetching task details for edit:', error);
          if (messageDiv) displayModalMessage(messageDiv, `Error loading task details: ${error.message}`, true);
        });
      }
    });
  }

  const editTaskForm = document.getElementById('editTaskForm');
  if (editTaskForm) {
    editTaskForm.addEventListener('submit', handleEditTaskFormSubmit);
  }

  const saveNewTaskButton = document.getElementById('saveNewTaskBtn');
  if (saveNewTaskButton && addNewTaskModalInstance) {
    saveNewTaskButton.addEventListener('click', async function(event) {
      event.preventDefault();

      const title = document.getElementById('taskTitleInput').value.trim();
      const description = document.getElementById('taskDescriptionInput').value.trim();
      const dueDate = document.getElementById('taskDueDateInput').value;
      const priority = document.getElementById('taskPriorityInput').value;
      const status = document.getElementById('taskStatusInput').value;
      const propertyId = document.getElementById('taskPropertySelect').value;
      const staffId = document.getElementById('taskStaffSelect').value;

      if (!title) {
        alert('Task title is required.');
        return;
      }
      if (!propertyId) {
        alert('Please select a property.');
        return;
      }
      if (!staffId) {
        alert('Please assign a staff member.');
        return;
      }
      if (!priority) {
        alert('Please select a task priority.');
        return;
      }
      if (!status) {
        alert('Please select a task status.');
        return;
      }

      saveNewTaskButton.disabled = true;
      saveNewTaskButton.textContent = 'Saving...';

      const taskPayload = {
        task_title: title,
        task_description: description,
        task_due_date: dueDate || null,
        property_id: propertyId,
        staff_id: staffId, // This will be used for task_assignments in the Edge Function
        task_status: status,
        task_priority: priority
      };

      try {
        if (!window._supabase || !window._supabase.functions) {
          throw new Error('Supabase client or functions API is not available.');
        }

        const { data: responseData, error: functionError } = await window._supabase.functions.invoke('create-task', {
          body: taskPayload
        });

        if (functionError) {
          let errMsg = functionError.message;
          if (functionError.context && functionError.context.error && functionError.context.error.message) {
            errMsg = functionError.context.error.message;
          } else if (typeof functionError === 'object' && functionError !== null && functionError.details) {
             errMsg = functionError.details;
          }
          throw new Error(`Function error: ${errMsg}`);
        }

        if (responseData && responseData.error) {
          throw new Error(responseData.error);
        }

        if (!responseData) {
          throw new Error('Task creation failed or function returned an unexpected response. Please try again.');
        }

        const createTaskForm = document.getElementById('createTaskForm');
        if (createTaskForm) {
          createTaskForm.reset();
        }

        addNewTaskModalInstance.hide();

        const tasks = await fetchTasksAndRelatedData();
        renderTasks(tasks);

      } catch (error) {
        console.error('Error creating task:', error);
        alert(`Error creating task: ${error.message}`);
      } finally {
        saveNewTaskButton.disabled = false;
        saveNewTaskButton.textContent = 'Save Task';
      }
    });
  }
});

// Helper function to display messages in modals (if not already present)
function displayModalMessage(modalMessageElement, message, isError = false) {
    if (modalMessageElement) {
        modalMessageElement.innerHTML = `<div class="alert ${isError ? 'alert-danger' : 'alert-success'}" role="alert">${message}</div>`;
        // Assuming i18next is used and updateUI function exists for dynamic translations
        if (window.i18next && typeof window.updateUI === 'function') {
            window.updateUI();
        }
    }
}

async function handleEditTaskFormSubmit(event) {
  event.preventDefault();
  const saveButton = document.getElementById('saveTaskChanges');
  saveButton.disabled = true;
  saveButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
  const messageDiv = document.getElementById('editTaskMessage');
  messageDiv.innerHTML = '';

  const taskId = document.getElementById('editTaskId').value;
  const updatedTaskData = {
    task_title: document.getElementById('editTaskTitle').value.trim(),
    task_description: document.getElementById('editTaskDescription').value.trim(),
    // property_id is not editable here
    // assignee_id will require special handling for task_assignments table
    task_status: document.getElementById('editTaskStatusSelect').value,
    task_priority: document.getElementById('editTaskPrioritySelect').value,
    task_due_date: document.getElementById('editTaskDueDateInput').value || null,
    task_notes: document.getElementById('editTaskNotesTextarea').value.trim()
  };

  const newAssigneeUserId = document.getElementById('editTaskAssigneeSelect').value; // This will need proper value if dropdown is populated

  console.log('Saving task:', taskId, 'Data:', updatedTaskData, 'New Assignee ID:', newAssigneeUserId);

  let collectedErrorMessages = [];
  const supabase = window._supabase;

  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated. Cannot save changes.');
    }

    // 1. Process File Deletions
    if (filesToDeleteInEditModal.length > 0) {
      console.log('Deleting files:', filesToDeleteInEditModal);
      for (const fileIdToDelete of filesToDeleteInEditModal) {
        const { error: deleteFileError } = await supabase
          .from('task_files')
          .update({ is_deleted: true, updated_at: new Date().toISOString() }) // Mark as deleted
          .eq('id', fileIdToDelete);
        if (deleteFileError) {
          console.error('Error deleting file record:', deleteFileError);
          collectedErrorMessages.push(`Failed to delete file ID ${fileIdToDelete}: ${deleteFileError.message}`);
          // Optionally, decide if you want to stop the whole process or continue
        }
      }
    }

    // 2. Process File Uploads
    const imageFilesToUpload = document.getElementById('editTaskImageUpload').files;
    const documentFilesToUpload = document.getElementById('editTaskDocumentUpload').files;
    const uploadPromises = [];

    for (const file of imageFilesToUpload) {
      const storagePath = `${user.id}/${taskId}/${Date.now()}_${file.name}`; // Add timestamp for uniqueness
      uploadPromises.push(
        supabase.storage.from('task-images').upload(storagePath, file)
          .then(uploadResult => ({ ...uploadResult, originalFile: file, type: 'image' }))
      );
    }
    for (const file of documentFilesToUpload) {
      const storagePath = `${user.id}/${taskId}/${Date.now()}_${file.name}`; // Add timestamp for uniqueness
      uploadPromises.push(
        supabase.storage.from('task-documents').upload(storagePath, file)
          .then(uploadResult => ({ ...uploadResult, originalFile: file, type: 'document' }))
      );
    }

    if (uploadPromises.length > 0) {
      const uploadResults = await Promise.all(uploadPromises);
      const fileInsertPromises = [];
      uploadResults.forEach(uploadResult => {
        if (uploadResult.error) {
          console.error('Error uploading file:', uploadResult.error);
          collectedErrorMessages.push(`Failed to upload ${uploadResult.originalFile.name}: ${uploadResult.error.message}`);
        } else if (uploadResult.data) {
          fileInsertPromises.push(
            supabase.from('task_files').insert([{
              task_id: taskId,
              file_name: uploadResult.originalFile.name,
              storage_path: uploadResult.data.path,
              mime_type: uploadResult.originalFile.type,
              file_size: uploadResult.originalFile.size,
              uploaded_by: user.id,
              is_deleted: false
            }])
          );
        }
      });
      if (fileInsertPromises.length > 0) {
        const fileInsertResults = await Promise.all(fileInsertPromises);
        fileInsertResults.forEach(insertResult => {
          if (insertResult.error) {
            console.error('Error inserting file record:', insertResult.error);
            collectedErrorMessages.push(`Failed to save file metadata: ${insertResult.error.message}`);
          }
        });
      }
    }

    // 3. Update Core Task Details (including notes)
    const { error: updateTaskError } = await supabase
      .from('tasks')
      .update({ ...updatedTaskData, task_updated_at: new Date().toISOString() })
      .eq('task_id', taskId);

    if (updateTaskError) {
      console.error('Error updating task details:', updateTaskError);
      collectedErrorMessages.push(`Failed to update task details: ${updateTaskError.message}`);
    }

    // 4. Handle Assignee Change (Simplified: remove all, add new if specified)
    // This is a placeholder and might need more sophisticated logic for multiple assignees or history.
    if (newAssigneeUserId !== undefined) { // Check if assignee was meant to be changed
        const { data: currentAssignments, error: fetchAssignmentsError } = await supabase
            .from('task_assignments')
            .select('user_id')
            .eq('task_id', taskId);

        if (fetchAssignmentsError) {
            console.error('Error fetching current assignments:', fetchAssignmentsError);
            collectedErrorMessages.push('Could not verify current assignee. Assignee not changed.');
        } else {
            const currentAssigneeIds = currentAssignments.map(a => a.user_id);
            // If new assignee is different or if current assignments are multiple and new one is single
            let changeAssignee = false;
            if (currentAssigneeIds.length !== 1 || currentAssigneeIds[0] !== newAssigneeUserId) {
                changeAssignee = true;
            }

            if (changeAssignee) {
                console.log('Changing assignee. Current:', currentAssigneeIds, 'New:', newAssigneeUserId);
                const { error: deleteAssignmentsError } = await supabase
                    .from('task_assignments')
                    .delete()
                    .eq('task_id', taskId);

                if (deleteAssignmentsError) {
                    console.error('Error deleting old assignments:', deleteAssignmentsError);
                    collectedErrorMessages.push('Failed to update assignee (delete step).');
                } else if (newAssigneeUserId && newAssigneeUserId !== '') { // Ensure newAssigneeUserId is not empty
                    const { error: insertAssignmentError } = await supabase
                        .from('task_assignments')
                        .insert([{ task_id: taskId, user_id: newAssigneeUserId }]);
                    if (insertAssignmentError) {
                        console.error('Error inserting new assignment:', insertAssignmentError);
                        collectedErrorMessages.push('Failed to update assignee (insert step).');
                    }
                }
            }
        }
    }


    // 5. Finalize
    if (collectedErrorMessages.length > 0) {
      displayModalMessage(messageDiv, 'Task update encountered errors: ' + collectedErrorMessages.join('; '), true);
    } else {
      displayModalMessage(messageDiv, 'Task updated successfully!', false);
      await fetchTasksAndRelatedData().then(renderTasks); // Refresh main list
      filesToDeleteInEditModal = []; // Clear after successful deletions
      document.getElementById('editTaskImageUpload').value = ''; // Clear file input
      document.getElementById('editTaskDocumentUpload').value = ''; // Clear file input
      setTimeout(() => { // Give user time to read success message
        if (editTaskModalInstance) editTaskModalInstance.hide();
      }, 1500);
    }

  } catch (error) {
    console.error('Critical error during task update process:', error);
    displayModalMessage(messageDiv, `An unexpected critical error occurred: ${error.message}`, true);
  } finally {
    saveButton.disabled = false;
    saveButton.innerHTML = 'Save Changes';
  }
}
