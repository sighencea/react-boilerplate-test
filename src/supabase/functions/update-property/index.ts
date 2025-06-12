// supabase/functions/update-property/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Or your specific frontend URL
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Supabase URL or Service Role Key not configured.");
    }

    const supabaseAdminClient: SupabaseClient = createClient(supabaseUrl, serviceRoleKey);

    const userSupabaseClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY") ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: authError } = await userSupabaseClient.auth.getUser();

    if (authError || !user) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "User not authenticated" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const requestBody = await req.json();
    const {
      property_id,
      old_property_image_to_delete_path, // Client will send this parsed path
      ...fieldsToUpdate // other fields like property_name, address, property_image_url (which could be new)
    } = requestBody;

    const validationErrors: Record<string, string> = {};

    if (!property_id || typeof property_id !== 'string') {
      validationErrors.property_id = "Property ID is required for updates.";
    }

    // Server-Side Validation for other fields (trimmed and validated)
    if (fieldsToUpdate.property_name !== undefined) {
      if (typeof fieldsToUpdate.property_name !== 'string' || fieldsToUpdate.property_name.trim().length < 3) {
        validationErrors.property_name = "Property name must be at least 3 characters.";
      } else {
        fieldsToUpdate.property_name = fieldsToUpdate.property_name.trim();
      }
    }
    if (fieldsToUpdate.address !== undefined) {
      if (typeof fieldsToUpdate.address !== 'string' || fieldsToUpdate.address.trim().length < 10) {
        validationErrors.address = "Address must be at least 10 characters.";
      } else {
        fieldsToUpdate.address = fieldsToUpdate.address.trim();
      }
    }
    if (fieldsToUpdate.property_type !== undefined) {
        if (typeof fieldsToUpdate.property_type !== 'string' || fieldsToUpdate.property_type.trim() === "") {
            validationErrors.property_type = "Property type is required.";
        } else {
            fieldsToUpdate.property_type = fieldsToUpdate.property_type.trim();
        }
    }
    if (fieldsToUpdate.property_occupier !== undefined) {
        if (typeof fieldsToUpdate.property_occupier !== 'string' || fieldsToUpdate.property_occupier.trim() === "") {
            validationErrors.property_occupier = "Property Occupier is required.";
        } else {
            fieldsToUpdate.property_occupier = fieldsToUpdate.property_occupier.trim();
        }
    }
    if (fieldsToUpdate.property_details !== undefined && fieldsToUpdate.property_details !== null) {
        if (typeof fieldsToUpdate.property_details !== 'string' || fieldsToUpdate.property_details.trim().length > 5000) {
            validationErrors.property_details = "Property details must be a string (max 5000 characters).";
        } else {
            // Set to null if empty string after trimming, otherwise use trimmed value
            fieldsToUpdate.property_details = fieldsToUpdate.property_details.trim() === "" ? null : fieldsToUpdate.property_details.trim();
        }
    }
    if (fieldsToUpdate.property_image_url !== undefined) {
        if (typeof fieldsToUpdate.property_image_url !== 'string' || !fieldsToUpdate.property_image_url.startsWith('https://')) {
            validationErrors.property_image_url = "Valid property image URL (https://) is required if provided.";
        } else {
             fieldsToUpdate.property_image_url = fieldsToUpdate.property_image_url.trim();
        }
    }

    if (Object.keys(validationErrors).length > 0) {
      return new Response(JSON.stringify({ error: "Validation failed", errors: validationErrors }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Remove keys with undefined values from fieldsToUpdate
    Object.keys(fieldsToUpdate).forEach(key => {
        if (fieldsToUpdate[key] === undefined) {
            delete fieldsToUpdate[key];
        }
    });

    // Image Deletion Logic
    if (old_property_image_to_delete_path && typeof old_property_image_to_delete_path === 'string') {
        console.log(`Attempting to delete old image: ${old_property_image_to_delete_path}`);
        const { error: deleteError } = await supabaseAdminClient.storage
            .from('property-images') // Ensure this is your bucket name
            .remove([old_property_image_to_delete_path]);

        if (deleteError) {
            console.error("Error deleting old image from storage:", deleteError);
            // Optionally, add a warning to the response or handle as critical
        } else {
            console.log("Successfully deleted old image:", old_property_image_to_delete_path);
        }
    }

    // Database Update
    // Ensure there are fields to update after cleaning undefined keys and potential image URL
    if (Object.keys(fieldsToUpdate).length === 0 && !old_property_image_to_delete_path) {
        // If only image was "deleted" (by providing a new one) but no other fields changed,
        // it might be valid if property_image_url was part of fieldsToUpdate.
        // If fieldsToUpdate is empty AND no new image URL was provided, it's an issue.
        // The check `Object.keys(fieldsToUpdate).length === 0` handles cases where only `property_image_url` might be updated.
        // If even `property_image_url` is not in `fieldsToUpdate` (meaning it wasn't changed), then it's an empty update.
         return new Response(JSON.stringify({ error: "No fields provided for update or no change in image." }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    // If fieldsToUpdate is empty but old_property_image_to_delete_path was processed, it means only image changed.
    // This is fine if `fieldsToUpdate.property_image_url` was set.
    // If `fieldsToUpdate` became empty after stripping undefined values, and no new image URL was set, then it's an issue.
    // The previous check `Object.keys(fieldsToUpdate).length === 0` covers this.


    const { data: updatedData, error: dbError } = await supabaseAdminClient
      .from("properties")
      .update(fieldsToUpdate)
      .eq("id", property_id)
      .eq("user_id", user.id) // Ensure user can only update their own properties
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      return new Response(JSON.stringify({ error: "Database error: " + dbError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!updatedData) {
        return new Response(JSON.stringify({ error: "Property not found or user unauthorized to update." }), {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    return new Response(JSON.stringify({ success: true, data: updatedData }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    console.error("Unexpected error in Edge Function:", error);
    return new Response(JSON.stringify({ error: "Unexpected server error: " + message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
