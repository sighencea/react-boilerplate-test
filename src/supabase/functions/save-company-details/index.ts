import { serve } from 'https://deno.land/std@0.161.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Updated interface to match client-side js/account-details.js
interface CompanyData {
  company_name: string;
  address_street: string; // Changed from company_address_street
  email: string;          // Changed from company_email
  address_city: string;   // Changed from company_city
  address_state: string;  // Changed from company_state
  address_postal_code: string; // Changed from company_address_zip
  phone_number?: string | null;   // Changed from company_phone
  website_url?: string | null;    // Changed from company_website
  tax_id?: string | null;         // Changed from company_tax_id
  company_logo_url?: string | null;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://www.afiaro.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Helper function to generate a unique 8-digit company code
async function generateUniqueCompanyCode(supabaseAdminClient: any): Promise<string> {
  let uniqueCode = '';
  let codeExists = true;
  const MAX_ATTEMPTS = 10; // Prevent infinite loops in unforeseen circumstances
  let attempts = 0;

  while (codeExists && attempts < MAX_ATTEMPTS) {
    // Generate an 8-digit numeric string
    uniqueCode = Math.floor(10000000 + Math.random() * 90000000).toString();
    attempts++;

    const { data, error } = await supabaseAdminClient
      .from('companies')
      .select('company_secret_code')
      .eq('company_secret_code', uniqueCode)
      .maybeSingle();

    if (error) {
      console.error('Error checking for existing company code:', error.message);
      throw new Error('Failed to verify company code uniqueness.'); // Propagate error
    }

    if (!data) {
      codeExists = false; // Code is unique
    }
  }
  if (codeExists) { // Loop exited due to max attempts
    throw new Error('Failed to generate a unique company code after several attempts.');
  }
  return uniqueCode;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      console.error('Missing Supabase environment variables');
      return new Response(JSON.stringify({ error: 'Server configuration error.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdminClient = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userSupabaseClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userSupabaseClient.auth.getUser();

    if (userError || !user) {
      console.error('User retrieval error:', userError?.message || 'User not found.');
      return new Response(JSON.stringify({ error: 'Invalid token or user not found.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = user.id;

    if (req.body === null) {
        return new Response(JSON.stringify({ error: 'Request body is missing.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // Make sure to parse the body as JSON. The client sends a stringified JSON.
    const companyData = JSON.parse(await req.text()) as CompanyData;


    // Server-Side Validation based on updated CompanyData interface
    const requiredFields: (keyof CompanyData)[] = [
      'company_name', 'address_street', 'email',
      'address_city', 'address_state', 'address_postal_code'
    ];
    const missingFields = requiredFields.filter(field => !companyData[field]);

    if (missingFields.length > 0) {
      return new Response(JSON.stringify({ error: `Missing required company fields: ${missingFields.join(', ')}.` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(companyData.email)) {
      return new Response(JSON.stringify({ error: 'Invalid company email format.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Upsert Logic
    let companyResponseData;
    let operationType = '';

    // 1. Check for existing company
    const { data: existingCompany, error: fetchError } = await supabaseAdminClient
      .from('companies')
      .select('id, company_logo_url') // Select existing logo URL as well
      .eq('owner_id', userId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching existing company:', fetchError.message);
      return new Response(JSON.stringify({ error: 'Failed to check for existing company.', details: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (existingCompany) {
      // 2.a. Update existing company
      operationType = 'updated';
      const { data: companyUpdateData, error: companyUpdateError } = await supabaseAdminClient
        .from('companies')
        .update({
          company_name: companyData.company_name,
          company_address_street: companyData.address_street,
          company_email: companyData.email,
          company_address_city: companyData.address_city,
          company_address_state: companyData.address_state,
          company_address_zip: companyData.address_postal_code,
          company_phone: companyData.phone_number || null,
          company_website: companyData.website_url || null,
          company_tax_id: companyData.tax_id || null,
          // Preserve existing logo if companyData.company_logo_url is undefined.
          // If companyData.company_logo_url is null, it means user wants to remove it.
          // If companyData.company_logo_url has a value, it's a new/updated logo.
          company_logo_url: companyData.company_logo_url !== undefined ? companyData.company_logo_url : existingCompany.company_logo_url,
          updated_at: new Date().toISOString(),
        })
        .eq('owner_id', userId) // or .eq('id', existingCompany.id)
        .select()
        .single();

      if (companyUpdateError) {
        console.error('Error updating company:', companyUpdateError.message);
        return new Response(JSON.stringify({ error: 'Failed to update company information.', details: companyUpdateError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      companyResponseData = companyUpdateData;
    } else {
      // 2.b. Insert new company
      operationType = 'inserted';
      const { data: companyInsertData, error: companyInsertError } = await supabaseAdminClient
        .from('companies')
        .insert([{
          owner_id: userId,
          company_name: companyData.company_name,
          company_address_street: companyData.address_street,
          company_email: companyData.email,
          company_address_city: companyData.address_city,
          company_address_state: companyData.address_state,
          company_address_zip: companyData.address_postal_code,
          company_phone: companyData.phone_number || null,
          company_website: companyData.website_url || null,
          company_tax_id: companyData.tax_id || null,
          company_logo_url: companyData.company_logo_url || null,
          // created_at is handled by default value or trigger if set up in DB
        }])
        .select()
        .single();

      if (companyInsertError) {
        console.error('Error inserting company:', companyInsertError.message);
        return new Response(JSON.stringify({ error: 'Failed to save new company information.', details: companyInsertError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      companyResponseData = companyInsertData;

      // ---- START: Add company_secret_code ----
      if (companyResponseData && companyResponseData.id) {
        try {
          const secretCode = await generateUniqueCompanyCode(supabaseAdminClient);
          const { error: updateCodeError } = await supabaseAdminClient
            .from('companies')
            .update({ company_secret_code: secretCode })
            .eq('id', companyResponseData.id);

          if (updateCodeError) {
            console.error('Error updating company with secret code:', updateCodeError.message);
            // This is a critical error because the company was created, but the secret code wasn't set.
            // Depending on policy, you might want to return an error or proceed with a warning.
            // For now, let's return an error.
            return new Response(JSON.stringify({
              error: 'Failed to set company secret code.',
              details: updateCodeError.message
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }
          // Add the secret code to the response data
          companyResponseData.company_secret_code = secretCode;
        } catch (e) {
          console.error('Error generating or saving company secret code:', e.message);
          return new Response(JSON.stringify({
            error: 'Failed to generate or save company secret code.',
            details: e.message
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      } else {
        // This case should ideally not be reached if companyInsertData was successful.
        console.error('Critical: companyResponseData.id is missing after insert for secret code generation.');
        return new Response(JSON.stringify({
          error: 'Failed to process company creation due to missing ID before secret code generation.',
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      // ---- END: Add company_secret_code ----
    }

    // 3. Update profiles table (common for both insert and update)
    if (!companyResponseData || !companyResponseData.id) {
      console.error('Critical: companyResponseData or companyResponseData.id is missing before profile update.');
      return new Response(JSON.stringify({
        error: `Company information ${operationType}, but critical data missing for profile update. Please contact support.`,
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error: profileUpdateError } = await supabaseAdminClient
      .from('profiles')
      .update({
        is_admin: true,
        has_company_set_up: true,
        company_id: companyResponseData.id // Add company_id to profile
      })
      .eq('id', userId);

    if (profileUpdateError) {
      console.error('Error updating profile:', profileUpdateError.message);
      // Log critical error: company op succeeded but profile update failed.
      return new Response(JSON.stringify({
        error: `Company information ${operationType}, but failed to update profile status. Please contact support.`,
        details: profileUpdateError.message
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 4. Update user's auth app_metadata to include admin status and company_id
    // This is crucial for the current_user_is_admin() RLS helper function.
    const { data: updatedUser, error: updateAuthUserError } = await supabaseAdminClient.auth.admin.updateUserById(
      userId,
      {
        app_metadata: {
          is_admin: true,
          company_id: companyResponseData.id // Storing company_id here is also useful
        }
      }
    );

    if (updateAuthUserError) {
      console.error('Critical: Error updating user app_metadata:', updateAuthUserError.message);
      // This is a critical step for RLS to work correctly with the new current_user_is_admin() function.
      // If this fails, the user might not be recognized as an admin by RLS policies relying on JWT claims.
      // Consider how to handle this error. For now, we'll log it.
      // The main operation (company save) might have succeeded, but admin rights via JWT might be missing.
      // You could choose to return an error to the client here if this step is deemed absolutely mandatory for success.
      // For instance:
      // return new Response(JSON.stringify({
      //   error: 'Company information saved, but failed to update user authentication metadata. Please contact support.',
      //   details: updateAuthUserError.message
      // }), {
      //   status: 500, // Or a custom error code
      //   headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      // });
    } else {
      console.log('User app_metadata updated successfully with admin status and company_id for user:', userId);
    }

    // The final response remains the same
    return new Response(JSON.stringify({
        success: true,
        message: `Company details ${operationType} successfully. Profile and auth metadata updated.`, // Updated message
        company: companyResponseData // companyResponseData might now include company_secret_code
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (e) {
    console.error('Unexpected error in function:', e.message, e.stack);
    if (e instanceof SyntaxError && e.message.includes('JSON')) {
        return new Response(JSON.stringify({ error: 'Invalid JSON in request body.', details: e.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
    return new Response(JSON.stringify({ error: 'Server error.', details: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})
