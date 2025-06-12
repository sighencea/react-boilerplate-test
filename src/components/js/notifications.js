document.addEventListener('DOMContentLoaded', function() {
  const activeNotificationsList = document.getElementById('activeNotificationsList');
  const inactiveNotificationsList = document.getElementById('inactiveNotificationsList');
  const activeNotificationsPlaceholder = document.getElementById('activeNotificationsPlaceholder');
  // const inactiveNotificationsPlaceholder = document.getElementById('inactiveNotificationsPlaceholder'); // REMOVED - Will be dynamic
  const markAllReadBtn = document.getElementById('markAllReadBtn');
  const showActiveNotificationsBtn = document.getElementById('showActiveNotifications');
  const showInactiveNotificationsBtn = document.getElementById('showInactiveNotifications');

  function updateEmptyStatePlaceholders() {
    if (!activeNotificationsList || !activeNotificationsPlaceholder || !inactiveNotificationsList || !showActiveNotificationsBtn || !showInactiveNotificationsBtn) {
        console.warn("Required elements for notification placeholders not found. Skipping update.");
        return; 
    }

    // Active notifications list and its dedicated HTML placeholder
    if (activeNotificationsList.children.length === 0) {
      activeNotificationsList.style.display = 'none';
      if (activeNotificationsPlaceholder && showActiveNotificationsBtn.classList.contains('btn-primary')) {
        activeNotificationsPlaceholder.style.display = 'block';
      } else if (activeNotificationsPlaceholder) {
        activeNotificationsPlaceholder.style.display = 'none';
      }
    } else {
      // Only display if 'Active' filter is selected.
      if (showActiveNotificationsBtn.classList.contains('btn-primary')) {
        activeNotificationsList.style.display = 'block';
      } else {
        activeNotificationsList.style.display = 'none';
      }
      if (activeNotificationsPlaceholder) activeNotificationsPlaceholder.style.display = 'none';
    }

    // Inactive notifications list and its dynamic placeholder
    let dynamicInactivePlaceholder = document.getElementById('dynamicInactivePlaceholder');
    if (inactiveNotificationsList.children.length === 0) {
      inactiveNotificationsList.style.display = 'none';
      // Only show dynamic placeholder if 'Inactive' filter is selected
      if (showInactiveNotificationsBtn.classList.contains('btn-primary')) {
        if (!dynamicInactivePlaceholder) {
          dynamicInactivePlaceholder = document.createElement('p');
          dynamicInactivePlaceholder.id = 'dynamicInactivePlaceholder';
          dynamicInactivePlaceholder.className = 'text-muted p-3'; // Match styling
          if (inactiveNotificationsList.parentNode) {
            // Insert after the inactiveNotificationsList element
            inactiveNotificationsList.parentNode.insertBefore(dynamicInactivePlaceholder, inactiveNotificationsList.nextSibling);
          }
        }
        dynamicInactivePlaceholder.textContent = i18next.t('notificationsPage.noInactiveMessage');
        dynamicInactivePlaceholder.style.display = 'block';
      } else if (dynamicInactivePlaceholder) {
        dynamicInactivePlaceholder.style.display = 'none'; // Hide if not relevant filter
      }
    } else {
      // Only display if 'Inactive' filter is selected.
      if (showInactiveNotificationsBtn.classList.contains('btn-primary')) {
        inactiveNotificationsList.style.display = 'block';
      } else {
        inactiveNotificationsList.style.display = 'none';
      }
      if (dynamicInactivePlaceholder) {
        // Remove or hide. Removing is cleaner if list has items.
        dynamicInactivePlaceholder.remove();
      }
    }
  }

  function handleNotificationAction(event) {
    const targetButton = event.target;
    const notificationItem = targetButton.closest('.list-group-item');

    if (!notificationItem) return;

    let itemMoved = false;

    // Handle "Mark as read" / "Mark as unread" clicks
    if (targetButton.classList.contains('mark-as-read-btn')) {
      event.stopPropagation(); 
      notificationItem.classList.add('notification-read');
      targetButton.textContent = i18next.t('notificationsJs.markUnread');
      targetButton.classList.remove('mark-as-read-btn', 'btn-outline-secondary');
      targetButton.classList.add('mark-as-unread-btn', 'btn-secondary');
      
      inactiveNotificationsList.appendChild(notificationItem); 
      itemMoved = true;

    } else if (targetButton.classList.contains('mark-as-unread-btn')) {
      event.stopPropagation(); 
      notificationItem.classList.remove('notification-read');
      targetButton.textContent = i18next.t('notificationsJs.markRead');
      targetButton.classList.remove('mark-as-unread-btn', 'btn-secondary');
      targetButton.classList.add('mark-as-read-btn', 'btn-outline-secondary');

      activeNotificationsList.appendChild(notificationItem); 
      itemMoved = true;
    }

    // Handle "Delete" clicks
    if (targetButton.classList.contains('delete-notification-btn')) {
      event.stopPropagation(); 
      notificationItem.remove();
      itemMoved = true; // Treat deletion as a list change
    }

    if (itemMoved) {
      updateEmptyStatePlaceholders();
    }
  }

  if (activeNotificationsList) {
    activeNotificationsList.addEventListener('click', handleNotificationAction);
  }
  if (inactiveNotificationsList) {
    inactiveNotificationsList.addEventListener('click', handleNotificationAction);
  }

  // Initial empty state check
  updateEmptyStatePlaceholders(); 

  // Default view: Show active notifications, hide inactive.
  // updateEmptyStatePlaceholders will then refine visibility based on content.
  if (activeNotificationsList) activeNotificationsList.style.display = 'block'; // Default to showing active list
  if (inactiveNotificationsList) inactiveNotificationsList.style.display = 'none'; // Default to hiding inactive list

  let initialDynamicInactivePlaceholder = document.getElementById('dynamicInactivePlaceholder');
  if (initialDynamicInactivePlaceholder) initialDynamicInactivePlaceholder.style.display = 'none'; // Ensure dynamic is hidden initially

  // Call again to ensure placeholders are correctly set based on the default view AND content
  updateEmptyStatePlaceholders();
  // Initial button styles (Active as primary) are set in HTML.

  if (showActiveNotificationsBtn) {
    showActiveNotificationsBtn.addEventListener('click', function() {
      if (activeNotificationsList) activeNotificationsList.style.display = 'block';   // Show active
      if (inactiveNotificationsList) inactiveNotificationsList.style.display = 'none'; // Hide inactive

      let dynamicInactivePlaceholder = document.getElementById('dynamicInactivePlaceholder');
      if (dynamicInactivePlaceholder) {
        dynamicInactivePlaceholder.style.display = 'none'; // Also hide dynamic placeholder
      }

      showActiveNotificationsBtn.classList.add('btn-primary');
      showActiveNotificationsBtn.classList.remove('btn-outline-secondary');

      if (showInactiveNotificationsBtn) {
        showInactiveNotificationsBtn.classList.add('btn-outline-secondary');
        showInactiveNotificationsBtn.classList.remove('btn-primary');
      }

      updateEmptyStatePlaceholders();
    });
  }

  if (showInactiveNotificationsBtn) {
    showInactiveNotificationsBtn.addEventListener('click', function() {
      if (activeNotificationsList) activeNotificationsList.style.display = 'none';     // Hide active
      if (activeNotificationsPlaceholder) activeNotificationsPlaceholder.style.display = 'none'; // Explicitly hide active placeholder
      if (inactiveNotificationsList) inactiveNotificationsList.style.display = 'block'; // Show inactive (its content will be checked by placeholder func)

      if (showActiveNotificationsBtn) {
        showActiveNotificationsBtn.classList.add('btn-outline-secondary');
        showActiveNotificationsBtn.classList.remove('btn-primary');
      }

      showInactiveNotificationsBtn.classList.add('btn-primary');
      showInactiveNotificationsBtn.classList.remove('btn-outline-secondary');

      updateEmptyStatePlaceholders();
    });
  }

  if (markAllReadBtn) {
    markAllReadBtn.addEventListener('click', function() {
      const itemsToMarkRead = Array.from(activeNotificationsList.querySelectorAll('.list-group-item'));
      
      if (itemsToMarkRead.length === 0) {
        // Optionally, provide feedback if there's nothing to mark as read
        // console.log("No active notifications to mark as read.");
        return; 
      }

      itemsToMarkRead.forEach(item => {
        // Add .notification-read class to the list item
        item.classList.add('notification-read');
        
        // Find the "Mark as read" button within this item
        const button = item.querySelector('.mark-as-read-btn'); // Only target unread buttons
        if (button) {
          button.textContent = i18next.t('notificationsJs.markUnread');
          button.classList.remove('mark-as-read-btn', 'btn-outline-secondary');
          button.classList.add('mark-as-unread-btn', 'btn-secondary');
        }
        
        // Move the item to the inactive list
        inactiveNotificationsList.appendChild(item);
      });
      
      updateEmptyStatePlaceholders();
    });
  }

  // Final empty state check based on initially displayed list (active)
  // updateEmptyStatePlaceholders(); // This call is already present after setting default view.
});
