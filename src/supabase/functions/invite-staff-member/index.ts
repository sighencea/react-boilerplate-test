// supabase/functions/invite-staff-member/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('Edge Function `invite-staff-member` booting up');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // For testing; restrict to your app's domain in production
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', // Specify allowed methods
}

serve(async (req: Request) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { email, firstName, lastName, role } = await req.json();
    console.log('Received request to invite staff:', { email, firstName, lastName, role });

    if (!email || !firstName || !lastName || !role) {
      return new Response(JSON.stringify({ error: 'Missing required fields: email, firstName, lastName, role' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Get the authenticated user (the admin performing the action)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
        console.error('No Authorization header found');
        return new Response(JSON.stringify({ error: 'User not authenticated' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 401,
        });
    }
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user: invokerUser }, error: userError } = await supabaseAdmin.auth.getUser(jwt);

    if (userError || !invokerUser) {
      console.error('Error fetching invoker user or user not found:', userError);
      return new Response(JSON.stringify({ error: 'Failed to identify inviting user.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      });
    }
    console.log('Invoker user ID:', invokerUser.id);

    // Check if the invoker is an admin and get their company_id
    const { data: adminProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('company_id, is_admin')
      .eq('id', invokerUser.id)
      .single();

    if (profileError) {
      console.error('Error fetching admin profile:', profileError);
      return new Response(JSON.stringify({ error: 'Could not verify admin status.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    if (!adminProfile) {
        console.error('Admin profile not found for invoker ID:', invokerUser.id);
        return new Response(JSON.stringify({ error: 'Admin profile not found.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 403, // Forbidden, as the user might be valid but not an admin profile
        });
    }

    console.log('Admin profile fetched:', adminProfile);

    if (!adminProfile.is_admin) {
      console.warn('Invoker is not an admin:', invokerUser.id);
      return new Response(JSON.stringify({ error: 'User does not have admin privileges to invite staff.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 403, // Forbidden
      });
    }

    if (!adminProfile.company_id) {
      console.error('Admin inviting staff does not have a company_id:', invokerUser.id);
      return new Response(JSON.stringify({ error: 'Admin is not associated with a company.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400, // Bad Request or 500, as admin setup is incomplete
      });
    }
    console.log('Admin company ID:', adminProfile.company_id);

    // Invite the new staff member
    const { data: inviteResponse, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          first_name: firstName,
          last_name: lastName,
          user_role: role,
          company_id: adminProfile.company_id,
          is_admin: false, // Staff members are not admins by default
          user_status: 'Invited' // Supabase handles the initial state; trigger can refine if needed
                                  // raw_app_meta_data in the trigger will contain this 'data' object
        },
        redirectTo: 'https://www.afiaro.com/pages/set-password.html'
      }
    );

    if (inviteError) {
      console.error('Error inviting user:', inviteError);
      // Check for specific errors, e.g., user already registered
      if (inviteError.message.includes('User already registered')) {
         return new Response(JSON.stringify({ error: 'This email is already registered. If they are part of your company, they should appear in the staff list. If not, please use a different email.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 409, // Conflict
        });
      }
      return new Response(JSON.stringify({ error: `Failed to send invitation: ${inviteError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    console.log('Invitation sent successfully to:', email, 'Response:', inviteResponse);
    // The inviteResponse for inviteUserByEmail contains the invited user object.
    // We don't strictly need to return it all, but can confirm success.
    return new Response(JSON.stringify({ message: 'Invitation sent successfully!', userId: inviteResponse.user?.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Unexpected error in invite-staff-member function:', error);
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})

/*
To test locally (after `supabase start`):
1. Ensure you have an admin user. Get their JWT.
2. Run:
supabase functions serve invite-staff-member --no-verify-jwt

curl -i --location --request POST 'http://localhost:54321/functions/v1/invite-staff-member' --header 'Authorization: Bearer YOUR_ADMIN_USER_JWT' --header 'Content-Type: application/json' --data '{
    "email": "newstaff@example.com",
    "firstName": "New",
    "lastName": "Staff",
    "role": "Electrician"
}'

If using --no-verify-jwt for serving, the JWT isn't checked by Supabase,
but the function still tries to get user from it.
For actual deployment, JWT verification is handled by Supabase gateway.
*/
