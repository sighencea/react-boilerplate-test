import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://njubyuqpavmxqdokxftq.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qdWJ5dXFwYXZteHFkb2t4ZnRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgyNjQxMTAsImV4cCI6MjA2Mzg0MDExMH0.LAoiywXkz-Cx9Y178j_YsPu8y7mETWN53tN4jKHo2Tw";

if (supabaseUrl === 'YOUR_SUPABASE_URL_PLACEHOLDER_ERROR' || supabaseAnonKey === 'YOUR_SUPABASE_ANON_KEY_PLACEHOLDER_ERROR') {
  console.error(
    'CRITICAL ERROR: Supabase URL and/or Anon Key are placeholders in supabaseClient.js. ' +
    'This means credentials were not correctly extracted or provided from js/supabase-config.js. ' +
    'The application will not connect to Supabase.'
  );
} else if (supabaseUrl.includes('your-supabase-url') || supabaseAnonKey.includes('your-supabase-anon-key') || supabaseUrl.includes('YOUR_SUPABASE_URL') || supabaseAnonKey.includes('YOUR_SUPABASE_ANON_KEY')) {
    console.warn(
    'WARNING: Supabase URL and/or Anon Key might be example placeholders from the original js/supabase-config.js. '+
    'Please ensure supabase-config.js contains your actual project credentials for full functionality. '+
    'Supabase URL: ' + supabaseUrl
  );
}


export const supabase = createClient(supabaseUrl, supabaseAnonKey);
