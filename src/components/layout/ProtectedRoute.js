import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading, session } = useAuth();
  const router = useRouter();

  // Check for onboardingComplete status from localStorage, as per original app logic.
  const onboardingComplete = typeof window !== 'undefined' ? localStorage.getItem('onboardingComplete') === 'true' : false;

  useEffect(() => {
    if (loading) {
      return; // Don't do anything while loading
    }

    if (!user && !session) {
      // User not logged in, redirect them to the / (SignInPage)
      router.replace({ pathname: '/', query: { from: router.pathname } });
      return;
    }

    // Onboarding check
    if (typeof window !== 'undefined' && localStorage.getItem('onboardingComplete') !== null && !onboardingComplete) {
      // If trying to access dashboard or properties without onboarding, redirect to root.
      // This logic might need refinement based on specific onboarding pages.
      if (router.pathname === '/dashboard' || router.pathname === '/properties') {
        console.warn('User onboarding not complete, redirecting from protected route to /.');
        router.replace({ pathname: '/', query: { from: router.pathname } });
        return;
      }
    }
  }, [user, session, loading, router, onboardingComplete]);

  if (loading) {
    return <div>Loading authentication status...</div>;
  }

  // If a redirect is going to happen, children shouldn't be rendered,
  // or should be replaced by a loading/null state.
  // The useEffect handles the redirect. If conditions for redirect are met,
  // we can return null or a loading spinner here to prevent rendering children temporarily.
  if (!user && !session && !loading) {
    return null; // Or a loading indicator, won't be visible long due to redirect
  }

  if (typeof window !== 'undefined' && localStorage.getItem('onboardingComplete') !== null && !onboardingComplete && !loading) {
    if (router.pathname === '/dashboard' || router.pathname === '/properties') {
      return null; // Or a loading indicator
    }
  }

  return children;
};

export default ProtectedRoute;
