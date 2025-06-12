// supabase/functions/activate-profile/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Define corsHeaders directly in this file
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // For testing; restrict to your app's domain in production
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', // Specify allowed methods
}

console.log('Edge Function `activate-profile` booting up');

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase admin client (to update profiles table)
    const supabaseAdmin = createClient(
      Deno.env.get('CUSTOM_SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('CUSTOM_SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the user from the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('[activate-profile] No Authorization header found');
      return new Response(JSON.stringify({ error: 'User not authenticated' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(jwt);

    if (userError || !user) {
      console.error('[activate-profile] Error fetching user or user not found:', userError);
      return new Response(JSON.stringify({ error: 'Failed to identify user from token.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    console.log('[activate-profile] User ID to activate:', user.id);

    // Update the user's profile status to 'Active' if it was 'Invited'
    const { data: updateData, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ user_status: 'Active', updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .eq('user_status', 'Invited') // Only update if current status is 'Invited'
      .select('id, user_status') // Select to confirm update and check if row was found
      .single(); // Use single to get one row or null, and error if multiple (shouldn't happen for ID)

    if (updateError) {
      // If error is because no rows were found (PGRST116), it means status wasn't 'Invited' or profile DNE
      if (updateError.code === 'PGRST116') {
        console.warn(`[activate-profile] Profile not updated for user ${user.id}. Status might not have been 'Invited' or profile missing. Error: ${updateError.message}`);
        // Still return success as the user is authenticated and this is a "best effort" activation.
        // Or, could return a specific message if desired.
        return new Response(JSON.stringify({ message: 'Profile status not changed (was not Invited or profile missing).', details: updateError.message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200, // Or 404/409 if we want to signify no action was taken
        });
      }
      console.error('[activate-profile] Error updating profile status:', updateError);
      return new Response(JSON.stringify({ error: `Failed to update profile status: ${updateError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    if (!updateData) {
        // This case should ideally be caught by PGRST116 if .single() is used and no row matches BOTH id and status.
        // If it gets here, it means the query ran but returned no data, which is unexpected with .single() if no error.
        console.warn(`[activate-profile] Profile not updated for user ${user.id}. No data returned after update, status might not have been 'Invited' or profile missing.`);
        return new Response(JSON.stringify({ message: 'Profile activation did not modify any record.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200, // Or a more specific status like 404 if no profile was found.
        });
    }

    console.log('[activate-profile] Profile status updated successfully for user:', user.id, 'New status:', updateData.user_status);
    return new Response(JSON.stringify({ message: 'Profile activated successfully!', newStatus: updateData.user_status }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[activate-profile] Unexpected error in activate-profile function:', error);
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})
