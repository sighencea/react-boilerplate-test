import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading, session } = useAuth();
  const location = useLocation();

  // Check for onboardingComplete status from localStorage, as per original app logic.
  // This might be refined later to be part of AuthContext if profile fetching is robust there.
  const onboardingComplete = localStorage.getItem('onboardingComplete') === 'true';

  if (loading) {
    // Show a loading spinner or a blank page while auth state is being determined
    // For now, a simple message or null to avoid layout shifts.
    return <div>Loading authentication status...</div>; // Or a proper loading component
  }

  if (!user && !session) { // Check both user and session for robustness
    // User not logged in, redirect them to the /login page (root path in our case).
    // Pass the current location so we can redirect them back after login.
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // If user is logged in, but onboarding is not complete,
  // and they are trying to access a page other than account setup or other specific allowed pages.
  // The original app redirected to agency_setup_page.html if has_company_set_up was false for admins.
  // This logic might need to be more granular depending on the page.
  // For now, if onboardingComplete flag exists and is false, redirect to a placeholder setup page or root.
  // This is a simplified version of the complex redirection logic in SignInPage's handleSuccessfulSignIn.
  // A more robust solution would involve checking specific profile flags from AuthContext.
  if (localStorage.getItem('onboardingComplete') !== null && !onboardingComplete) {
     // Example: if admin and company not set up, redirect to agency_setup_page
     // This check needs to be more specific. For now, let's assume if onboarding is not complete,
     // they should be on a specific page or redirected.
     // This is a placeholder for more complex onboarding flow management.
     // If trying to access dashboard without onboarding, redirect to a safe page or root.
     if (location.pathname === '/pages/dashboard.html' || location.pathname === '/pages/properties.html') {
        console.warn('User onboarding not complete, redirecting from protected route.');
        // Redirect to a specific setup page if defined, or back to root for now.
        // navigate('/pages/agency_setup_page.html'); // This would be ideal if that page exists
        return <Navigate to="/" state={{ from: location }} replace />; // Fallback to root
     }
  }

  return children; // User is authenticated (and onboarding considered complete for this basic check), render the requested component.
};

export default ProtectedRoute;
