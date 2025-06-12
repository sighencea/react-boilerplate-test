// supabase/functions/create-initial-profile/index.ts

import { serve } from 'https://deno.land/std@0.161.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('Create Initial Profile Edge Function starting up...');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Permissive for local dev; restrict in production
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface RequestBody { // Only preferredUiLanguage is now expected from the body
  preferredUiLanguage?: string;
}

interface ProfileData {
  id: string;
  email?: string;
  first_name: string;
  preferred_ui_language: string;
  user_status: 'New';
  is_admin: boolean;
  has_company_set_up: boolean;
  company_id: null; // Explicitly null
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Request received:', req.method, req.url);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing Supabase environment variables (URL or Service Role Key).');
      return new Response(JSON.stringify({ error: 'Server configuration error: Missing environment variables.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdminClient: SupabaseClient = createClient(supabaseUrl, serviceRoleKey);
    console.log('Supabase admin client initialized.');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.warn('Missing Authorization header.');
      return new Response(JSON.stringify({ error: 'Missing authorization header.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const jwt = authHeader.replace('Bearer ', '');
    console.log('JWT extracted from Authorization header.');

    const { data: { user }, error: userError } = await supabaseAdminClient.auth.getUser(jwt);

    if (userError) {
      console.error('Error getting user from JWT:', userError.message);
      return new Response(JSON.stringify({ error: 'Invalid token or user retrieval failed.', details: userError.message }), {
        status: 403, // Forbidden or Unauthorized
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!user) {
      console.error('No user found for the provided JWT.');
      return new Response(JSON.stringify({ error: 'User not found for token.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log('[create-initial-profile] User object retrieved:', JSON.stringify(user, null, 2));
    // console.log('User retrieved successfully from JWT:', user.id, user.email); // Original log, can be kept or removed

    // Attempt to parse preferredUiLanguage from body, can be null or undefined if body is empty or not JSON
    let preferredUiLanguageFromBody: string | undefined = undefined;
    if (req.body) {
        try {
            const requestBody: RequestBody = await req.json();
            console.log('Request body parsed:', requestBody);
            if (requestBody && typeof requestBody.preferredUiLanguage === 'string') {
                preferredUiLanguageFromBody = requestBody.preferredUiLanguage;
            }
        } catch (e) {
            // Log error but don't fail if body is not valid JSON, as it's optional
            console.warn('Could not parse request body as JSON or preferredUiLanguage not found/valid:', e.message);
        }
    } else {
        console.log('No request body present or body is null.')
    }

    const userMetadata = user.user_metadata;
    console.log('[create-initial-profile] User metadata received:', JSON.stringify(userMetadata, null, 2));

    const firstName = userMetadata?.first_name as string | undefined; // Type assertion
    const accountType = userMetadata?.account_type as 'agency' | 'user' | undefined; // Type assertion

    // preferredUiLanguage determination is already here, just adding logs after it
    const determinedPreferredUiLanguage = preferredUiLanguageFromBody || userMetadata?.preferred_ui_language as string || 'en';

    console.log('[create-initial-profile] Extracted firstName:', firstName);
    console.log('[create-initial-profile] Extracted accountType:', accountType);
    console.log('[create-initial-profile] Determined preferredUiLanguage:', determinedPreferredUiLanguage);

    if (!firstName || firstName.trim() === '') {
      console.warn('Validation failed: first_name not found or empty in user metadata.');
      return new Response(JSON.stringify({ error: 'First name not found in user metadata. Please ensure it was set during sign-up.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!accountType || (accountType !== 'agency' && accountType !== 'user')) {
      console.warn('Validation failed: account_type not found or invalid in user metadata.');
      return new Response(JSON.stringify({ error: 'Valid account type (agency/user) not found in user metadata. Please ensure it was set during sign-up.' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const profileDataToInsert: ProfileData = {
      id: user.id,
      email: user.email,
      first_name: firstName.trim(),
      preferred_ui_language: preferredUiLanguageFromBody || userMetadata?.preferred_ui_language as string || 'en', // Prioritize body, then metadata, then default
      user_status: 'New',
      is_admin: accountType === 'agency',
      has_company_set_up: false,
      company_id: null,
    };
    console.log('[create-initial-profile] Data to be inserted into profiles:', JSON.stringify(profileDataToInsert, null, 2));

    const { data: insertedProfile, error: insertError } = await supabaseAdminClient
      .from('profiles')
      .insert([profileDataToInsert])
      .select()
      .single(); // Use single() if you expect only one row and want the object directly

    if (insertError) {
      console.error('Error inserting profile:', insertError.message);
      // Check for specific error codes, e.g., unique constraint violation (23505 for PostgreSQL)
      if (insertError.code === '23505') {
        return new Response(JSON.stringify({ error: 'Profile already exists for this user.', details: insertError.message }), {
          status: 409, // Conflict
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'Failed to create profile.', details: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[create-initial-profile] Profile successfully inserted/selected:', JSON.stringify(insertedProfile, null, 2));
    // console.log('Profile created successfully:', insertedProfile); // Original log
    return new Response(JSON.stringify({ success: true, profile: insertedProfile }), {
      status: 201, // Created
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    console.error('Unexpected error in function:', e.message, e.stack);
    return new Response(JSON.stringify({ error: 'Server error.', details: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})
