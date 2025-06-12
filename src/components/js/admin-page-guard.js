// js/admin-page-guard.js
(async function checkAdminAccessAndRedirect() {
  // Try to hide main content quickly to prevent flash of content on admin pages.
  // This assumes your main page content (excluding sidebar/topbar if they are separate)
  // is wrapped in a div with id 'pageSpecificContent' or similar.
  // If not, this part might need adjustment or be handled by initially hiding content via CSS.
  const pageSpecificContent = document.getElementById('pageSpecificContent'); // Placeholder ID
  if (pageSpecificContent) {
    pageSpecificContent.style.display = 'none';
  } else {
    console.warn('Admin Page Guard: Could not find #pageSpecificContent to hide initially. Consider wrapping page content.');
  }

  if (!window._supabase) {
    console.error('Supabase client not available for admin page guard. Redirecting to login.');
    window.location.href = '../index.html'; // Adjust if your login page is different
    return;
  }

  let accessDeniedModalInstance = null;
  const accessDeniedModalEl = document.getElementById('accessDeniedModal');
  if (accessDeniedModalEl) {
     accessDeniedModalInstance = new bootstrap.Modal(accessDeniedModalEl, {
         backdrop: 'static', // Already set in HTML, but good to be explicit if needed
         keyboard: false     // Already set in HTML
     });
  } else {
      console.error("Access Denied Modal HTML not found on this page!");
      // Fallback behavior if modal is missing: just redirect non-admins without modal.
  }

  const redirectToTasksBtn = document.getElementById('redirectToTasksBtn');
  if (redirectToTasksBtn) {
     redirectToTasksBtn.addEventListener('click', () => {
         window.location.href = 'tasks.html'; // Assumes admin pages are in pages/ directory
     });
  }

  try {
    const { data: { user }, error: userError } = await window._supabase.auth.getUser();

    if (userError || !user) {
      console.log('Admin Page Guard: No user logged in or error fetching user. Redirecting to login.');
      window.location.href = '../index.html'; // Adjust path if login page is different
      return;
    }

    const { data: profile, error: profileError } = await window._supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Admin Page Guard: Error fetching profile. Denying access by default.', profileError);
      if (accessDeniedModalInstance) {
         accessDeniedModalInstance.show();
      } else {
         window.location.href = 'tasks.html'; // Fallback if modal isn't there
      }
      return;
    }

    const isAdmin = profile ? profile.is_admin : false;
    localStorage.setItem('userIsAdmin', isAdmin.toString()); // Also update localStorage for consistency

    if (!isAdmin) {
      console.log('Admin Page Guard: User is not admin. Showing access denied modal.');
      if (accessDeniedModalInstance) {
         accessDeniedModalInstance.show();
      } else {
         window.location.href = 'tasks.html'; // Fallback
      }
      // Content remains hidden (or should be ensured hidden by modal logic)
    } else {
      console.log('Admin Page Guard: User is admin. Access granted.');
      if (pageSpecificContent) {
        pageSpecificContent.style.display = ''; // Show content
      }
    }
  } catch (e) {
    console.error('Admin Page Guard: Exception during access check. Denying access.', e);
    if (accessDeniedModalInstance) {
         accessDeniedModalInstance.show();
    } else {
         window.location.href = 'tasks.html'; // Fallback
    }
  }
})();
