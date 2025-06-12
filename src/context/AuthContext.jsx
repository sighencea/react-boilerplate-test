import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    setLoading(true);
    const getInitialSession = async () => {
      const { data: { session: initialSess } } = await supabase.auth.getSession();
      setSession(initialSess);
      setUser(initialSess?.user ?? null);
      // Check for app_metadata.is_admin from the session user object
      setIsAdmin(initialSess?.user?.app_metadata?.is_admin === true);
      // Also persist to localStorage as original app did
      if (initialSess?.user?.app_metadata?.is_admin !== undefined) {
        localStorage.setItem('userIsAdmin', initialSess.user.app_metadata.is_admin.toString());
      } else if (initialSess) { // User exists but no is_admin in app_metadata
        localStorage.setItem('userIsAdmin', 'false'); // Default to false if not present
      } else {
        localStorage.removeItem('userIsAdmin');
      }
      setLoading(false);
    };

    getInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        setAuthError(null); // Clear previous errors on auth state change
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setIsAdmin(newSession?.user?.app_metadata?.is_admin === true);
        if (newSession?.user?.app_metadata?.is_admin !== undefined) {
          localStorage.setItem('userIsAdmin', newSession.user.app_metadata.is_admin.toString());
        } else if (newSession) {
          localStorage.setItem('userIsAdmin', 'false');
        } else {
          localStorage.removeItem('userIsAdmin');
        }
        setLoading(false);
      }
    );

    return () => {
      authListener?.unsubscribe();
    };
  }, []);

  const signInWithPassword = async (email, password) => {
    setLoading(true);
    setAuthError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      // Session and user state will be updated by onAuthStateChange listener
      return { success: true, data };
    } catch (error) {
      console.error('AuthContext signInError:', error);
      setAuthError(error);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  // signUp will include options.data for first_name and account_type as per original main.js
  const signUp = async (email, password, optionsData) => {
    setLoading(true);
    setAuthError(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: optionsData, // e.g., { first_name: 'John', account_type: 'agency' }
        },
      });
      if (error) throw error;
      // User might need email verification. Session will be null initially.
      // onAuthStateChange will handle user state if auto-verification is on or after verification.
      return { success: true, data };
    } catch (error) {
      console.error('AuthContext signUpError:', error);
      setAuthError(error);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      // User and session will be cleared by onAuthStateChange
      localStorage.removeItem('userIsAdmin'); // Explicitly clear
      localStorage.removeItem('onboardingComplete'); // Also clear this if used
      return { success: true };
    } catch (error) {
      console.error('AuthContext signOutError:', error);
      setAuthError(error);
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch profile data if needed, e.g. for verification status
  // This is separate as it accesses the 'profiles' table, not just 'auth.users'
  const fetchUserProfile = async (userId) => {
    if (!userId) return null;
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, is_verified_by_code, verification_code, has_company_set_up, preferred_ui_language') // isAdmin is from app_metadata
            .eq('id', userId)
            .single();
        if (error) {
            // PGRST116 means no row found, which is common for new users before profile creation
            if (error.code === 'PGRST116') {
                console.warn('Profile not found for user:', userId, error.message);
                return null;
            }
            throw error;
        }
        return data;
    } catch (error) {
        console.error('Error fetching user profile:', error);
        setAuthError(error); // Or a different error state for profile errors
        return null;
    }
  };


  const value = {
    session,
    user,
    isAdmin,
    loading,
    authError,
    setAuthError, // Allow components to clear errors or set custom ones
    signInWithPassword,
    signUp,
    signOut,
    fetchUserProfile, // Expose profile fetching
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
