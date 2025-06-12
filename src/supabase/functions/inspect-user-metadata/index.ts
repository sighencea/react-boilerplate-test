// supabase/functions/inspect-user-metadata/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

console.log('Edge Function `inspect-user-metadata` booting up');

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json();
    const userId = body.user_id;

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing user_id in request body' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    console.log(`[inspect-user-metadata] Received request for user_id: ${userId}`);

    // Create Supabase admin client to fetch user details directly from auth.users
    // Ensure your custom env vars are set in function settings, or use defaults
    const supabaseAdmin = createClient(
      Deno.env.get('CUSTOM_SUPABASE_URL') ?? Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('CUSTOM_SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (userError) {
      console.error(`[inspect-user-metadata] Error fetching user ${userId}:`, userError);
      return new Response(JSON.stringify({ error: `Failed to fetch user: ${userError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: userError.status || 500,
      });
    }

    if (!userData || !userData.user) {
      console.error(`[inspect-user-metadata] User ${userId} not found.`);
      return new Response(JSON.stringify({ error: `User ${userId} not found.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    const user = userData.user;
    const appMetadata = user.app_metadata; // In admin client, this is raw_app_meta_data
    const userMetadata = user.user_metadata; // In admin client, this is raw_user_meta_data

    console.log(`[inspect-user-metadata] User ${userId} app_metadata:`, JSON.stringify(appMetadata, null, 2));
    console.log(`[inspect-user-metadata] User ${userId} user_metadata:`, JSON.stringify(userMetadata, null, 2));

    return new Response(JSON.stringify({
      userId: user.id,
      email: user.email,
      raw_app_meta_data: appMetadata, // Note: admin API might call these app_metadata
      raw_user_meta_data: userMetadata // and user_metadata directly
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[inspect-user-metadata] Unexpected error:', error);
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})
