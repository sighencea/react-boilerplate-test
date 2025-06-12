// js/supabase-client.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'; // Import directly from ESM-friendly CDN

// These variables are expected to be defined in supabase-config.js, loaded before this script.
// Make sure supabase-config.js declares:
// const SUPABASE_URL = "YOUR_ACTUAL_SUPABASE_URL";
// const SUPABASE_ANON_KEY = "YOUR_ACTUAL_SUPABASE_ANON_KEY";
// (or window.SUPABASE_URL / window.SUPABASE_ANON_KEY if not using const directly in global scope from a script tag)

// To be safe, let's try accessing them from window object, or allow them to be consts in global scope.
const resolvedSupabaseUrl = typeof SUPABASE_URL !== 'undefined' ? SUPABASE_URL : (typeof window !== 'undefined' ? window.SUPABASE_URL : undefined);
const resolvedSupabaseAnonKey = typeof SUPABASE_ANON_KEY !== 'undefined' ? SUPABASE_ANON_KEY : (typeof window !== 'undefined' ? window.SUPABASE_ANON_KEY : undefined);

// Attempt to import credentials
let supabaseInstance = null;
let configError = false;

if (!resolvedSupabaseUrl || !resolvedSupabaseAnonKey || resolvedSupabaseUrl === 'YOUR_SUPABASE_URL_PLACEHOLDER' || resolvedSupabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY_PLACEHOLDER') {
  console.error(
    'CRITICAL ERROR: Supabase URL and/or Anon Key are not correctly defined. ' +
    'Ensure supabase-config.js is loaded before supabase-client.js and defines SUPABASE_URL and SUPABASE_ANON_KEY with your actual Supabase project credentials.'
  );
  configError = true;
  // Display error on page
  const msgDiv = document.getElementById('signupMessage') || document.getElementById('loginMessage') || document.body;
  if (msgDiv) {
    const errDiv = document.createElement('div');
    errDiv.innerHTML = '<strong style="color: red;">Supabase client is not configured. Check console for details.</strong>'; // Updated message
    msgDiv.prepend(errDiv);
  }
} else {
  try {
    // Use the already resolved URLs from window or consts
    supabaseInstance = createClient(resolvedSupabaseUrl, resolvedSupabaseAnonKey);
    console.log('Supabase client initialized using resolved credentials.');
    // No need to set configError = false here, as its default is false
  } catch (e) {
    console.error('Error during Supabase client initialization:', e);
    configError = true; // Set error flag

    // Display error message on page
    const msgDiv = document.getElementById('signupMessage') || document.getElementById('loginMessage') || document.body;
    if (msgDiv) {
      const errDiv = document.createElement('div');
      // Ensure this message is user-friendly and indicates action if possible
      errDiv.innerHTML = '<strong style="color: red;">Error initializing Supabase client. Please check console for details.</strong>';
      msgDiv.prepend(errDiv);
    }
  }
}

// Make the client instance globally available only if successfully initialized
if (!configError && supabaseInstance) {
  window._supabase = supabaseInstance;
} else {
  window._supabase = null; // Ensure it's null if setup failed
  console.warn('Supabase client initialization failed. window._supabase is not set.');
}
