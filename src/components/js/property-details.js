(async function() { // IIFE to keep scope clean
  document.addEventListener('DOMContentLoaded', async () => {
    if (!window._supabase) {
      console.error('Property Details: Supabase client not available.');
      const propertyTasksTableBody = document.getElementById('propertyTasksTableBody');
      if (propertyTasksTableBody) {
          propertyTasksTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error: Cannot load tasks (Supabase client not found).</td></tr>';
      }
      return;
    }
    const supabase = window._supabase;

    const urlParams = new URLSearchParams(window.location.search);
    const propertyId = urlParams.get('id');

    if (!propertyId) {
      console.error('Property Details: No property ID found in URL.');
      const propertyTasksTableBody = document.getElementById('propertyTasksTableBody');
      if (propertyTasksTableBody) {
          propertyTasksTableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error: Property ID missing. Cannot load tasks.</td></tr>';
      }
      // Also update the main property details area if propertyId is missing
      const propertyNameElement = document.getElementById('propertyName');
      if (propertyNameElement) propertyNameElement.textContent = 'Property Not Found';
      // Add similar messages for other main property detail elements if desired
      return;
    }

    // Initial fetch for property name (and other details if needed by this page directly)
    // This part is mostly from the original property-details.js logic for the header
    const { data: propertyData, error: propertyError } = await supabase
        .from('properties')
        .select('property_name,address,property_type,property_details,property_occupier,property_image_url')
        .eq('id', propertyId)
        .single();

    if (propertyError) {
        console.error('Error fetching property details:', propertyError);
        document.getElementById('propertyName').textContent = 'Error loading property';
    } else if (propertyData) {
        document.getElementById('propertyName').textContent = propertyData.property_name;
        // Populate other property details if those elements exist from original script
        if(document.getElementById('propertyAddress')) document.getElementById('propertyAddress').textContent = propertyData.address;
        if(document.getElementById('propertyType')) document.getElementById('propertyType').textContent = propertyData.property_type;
        if(document.getElementById('propertyOccupier')) document.getElementById('propertyOccupier').textContent = propertyData.property_occupier;
        if(document.getElementById('propertyDetailsText')) document.getElementById('propertyDetailsText').textContent = propertyData.property_details || 'No additional details provided.';

        const propertyImageElement = document.getElementById('propertyImage');
        if (propertyImageElement) {
            if (propertyData.property_image_url) {
                propertyImageElement.src = propertyData.property_image_url;
                propertyImageElement.alt = propertyData.property_name || 'Property Image';
            } else {
                propertyImageElement.src = `https://via.placeholder.com/700x400.png?text=${encodeURIComponent(propertyData.property_name || 'No Image Available')}`;
                propertyImageElement.alt = propertyData.property_name || 'No Image Available';
            }
        }
         // Setup links that depend on propertyId
        const editPropertyLink = document.getElementById('editPropertyLink');
        if (editPropertyLink) editPropertyLink.href = `add-property.html?id=${propertyId}`;

        const addTaskLink = document.getElementById('addTaskLink');
        if (addTaskLink) {
            // This might need to open a modal or redirect to a specific "create task for property" page
            // For now, let's assume it links to the main tasks page with property_id pre-selected if possible
            // Or opens the create task modal (which would require task modal JS to be on this page or global)
            addTaskLink.addEventListener('click', (e) => {
                e.preventDefault();
                // This is a placeholder; actual task creation UI would be more complex
                alert(`Placeholder: Add task for property ID ${propertyId}. This should open the task creation modal with property pre-filled.`);
            });
        }
    } else {
        document.getElementById('propertyName').textContent = 'Property not found';
    }

    // Back to properties link
    const backLink = document.getElementById('backToPropertiesLink');
    if (backLink) {
        backLink.href = 'properties.html';
    }


    // Fetch and render tasks for this property
    await fetchAndRenderPropertyTasks(propertyId, supabase);

    const propertyTasksTableBody = document.getElementById('propertyTasksTableBody');
    if (propertyTasksTableBody) {
        propertyTasksTableBody.addEventListener('click', function(event) {
            const viewButton = event.target.closest('.view-property-task-btn');
            const editButton = event.target.closest('.edit-property-task-btn');

            if (viewButton) {
                const taskId = viewButton.dataset.taskId;
                console.log(`View button clicked for task ID: ${taskId} on property ${propertyId}`);
                // This should ideally open the main View Task Modal from tasks.html or a shared component
                // For now, it's an alert. If tasks.html modals are used, need to ensure they are loaded/accessible.
                alert(`Placeholder: View task ${taskId}. This would normally open a modal with task details.`);
            }

            if (editButton) {
                const taskId = editButton.dataset.taskId;
                console.log(`Edit button clicked for task ID: ${taskId} on property ${propertyId}`);
                // This should ideally open the main Edit Task Modal from tasks.html or a shared component
                alert(`Placeholder: Edit task ${taskId}. This would normally open a modal to edit the task.`);
            }
        });
    }
  });

  async function fetchTasksForProperty(propertyId, supabase) {
    console.log(`Fetching tasks for property ID: ${propertyId}`);
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        task_id,
        task_title,
        task_status,
        task_due_date,
        detailed_task_assignments (
          assignee_first_name,
          assignee_last_name
        )
      `)
      .eq('property_id', propertyId);

    if (error) {
      console.error('Error fetching tasks for property:', error);
      throw error;
    }
    console.log('Tasks fetched for property:', data);
    return data || [];
  }

  function renderPropertyTasks(tasks, tableBodyElement) {
    tableBodyElement.innerHTML = '';

    if (!tasks || tasks.length === 0) {
      tableBodyElement.innerHTML = '<tr><td colspan="5" class="text-center" data-i18n="propertyDetailsPage.tasksTable.noTasks">No tasks found for this property.</td></tr>';
      if (window.i18next && typeof window.updateUI === 'function') {
           window.updateUI();
      }
      return;
    }

    tasks.forEach(task => {
      const tr = document.createElement('tr');
      tr.setAttribute('data-task-id', task.task_id);

      let assignedToText = 'Unassigned';
      if (task.detailed_task_assignments && task.detailed_task_assignments.length > 0) {
        assignedToText = task.detailed_task_assignments
          .map(a => `${a.assignee_first_name || ''} ${a.assignee_last_name || ''}`.trim() || 'Unnamed Assignee')
          .join(', ');
      }

      let dueDateFormatted = 'N/A';
      if (task.task_due_date) {
          try {
              // Ensure date is treated as UTC to avoid timezone shifts during formatting
              const dateParts = task.task_due_date.split('-');
              const dateObj = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2]));
              dueDateFormatted = dateObj.toLocaleDateString(document.documentElement.lang || 'en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).toUpperCase().replace(/ /g, '/');
          } catch (e) { console.error('Error formatting due date:', e); }
      }

      let statusHTML = `<span class="badge bg-secondary">${task.task_status || 'N/A'}</span>`;
      const lowerCaseStatus = (task.task_status || '').toLowerCase();
       if (lowerCaseStatus === 'new') statusHTML = `<span class="badge badge-custom-base badge-custom-blue">${task.task_status}</span>`;
       else if (lowerCaseStatus === 'in progress') statusHTML = `<span class="badge badge-custom-base badge-custom-yellow">${task.task_status}</span>`;
       else if (lowerCaseStatus === 'completed' || lowerCaseStatus === 'done') statusHTML = `<span class="badge badge-custom-base badge-custom-green">${task.task_status}</span>`;
       else if (lowerCaseStatus === 'cancelled') statusHTML = `<span class="badge badge-custom-base badge-custom-red">${task.task_status}</span>`;
       else if (lowerCaseStatus === 'not started') statusHTML = `<span class="badge badge-custom-base" style="background-color: #F1F3F4; color: #666666;">${task.task_status}</span>`;

      tr.innerHTML = `
        <td>${task.task_title || 'N/A'}</td>
        <td>${assignedToText}</td>
        <td>${statusHTML}</td>
        <td>${dueDateFormatted}</td>
        <td>
          <button class="btn btn-sm btn-info me-1 view-property-task-btn" data-task-id="${task.task_id}" aria-label="View Task"><i class="bi bi-eye"></i></button>
          <button class="btn btn-sm btn-warning edit-property-task-btn" data-task-id="${task.task_id}" aria-label="Edit Task"><i class="bi bi-pencil"></i></button>
        </td>
      `;
      tableBodyElement.appendChild(tr);
    });
  }

  async function fetchAndRenderPropertyTasks(propertyId, supabase) {
       const propertyTasksTableBody = document.getElementById('propertyTasksTableBody');
       if (!propertyTasksTableBody) {
           console.error('propertyTasksTableBody element not found for rendering tasks.');
           return;
       }
       propertyTasksTableBody.innerHTML = '<tr><td colspan="5" class="text-center" data-i18n="propertyDetailsPage.tasksTable.loading">Loading tasks...</td></tr>';
       if (window.i18next && typeof window.updateUI === 'function') { // For the loading text
            window.updateUI();
       }

       try {
           const tasks = await fetchTasksForProperty(propertyId, supabase);
           renderPropertyTasks(tasks, propertyTasksTableBody);
       } catch (error) {
           console.error('Failed to fetch and render tasks for property:', error);
           propertyTasksTableBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Error loading tasks: ${error.message}</td></tr>`;
       }
  }
})();
