-- supabase/migrations/20240514103100_create_auth_users_trigger.sql

CREATE OR REPLACE FUNCTION public.handle_new_invited_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_invite_data JSONB;
  profile_id UUID;
  profile_email TEXT;
  profile_company_id UUID;
  profile_user_role TEXT;
  profile_is_admin BOOLEAN;
  profile_user_status TEXT;
  profile_first_name TEXT;
  profile_last_name TEXT;
  profile_preferred_ui_language TEXT;
BEGIN
  RAISE NOTICE '[handle_new_invited_user] Trigger fired for new user ID: %, Email: %', NEW.id, NEW.email;

  user_invite_data := NEW.raw_user_meta_data; -- Changed from raw_app_meta_data
  RAISE NOTICE '[handle_new_invited_user] Raw user_meta_data from invite: %', user_invite_data;

  profile_id := NEW.id;
  profile_email := NEW.email;

  profile_company_id := (user_invite_data ->> 'company_id')::UUID;
  profile_user_role := user_invite_data ->> 'user_role';
  profile_is_admin := COALESCE((user_invite_data ->> 'is_admin')::BOOLEAN, FALSE);
  profile_user_status := COALESCE(user_invite_data ->> 'user_status', 'Invited');
  profile_first_name := user_invite_data ->> 'first_name';
  profile_last_name := user_invite_data ->> 'last_name';
  profile_preferred_ui_language := COALESCE((user_invite_data ->> 'preferred_ui_language')::TEXT, 'en');

  RAISE NOTICE '[handle_new_invited_user] Values to use for profile: id=%L, email=%L, fname=%L, lname=%L, role=%L, comp_id=%L, is_admin=%L, status=%L, lang=%L',
    profile_id, profile_email, profile_first_name, profile_last_name, profile_user_role, profile_company_id, profile_is_admin, profile_user_status, profile_preferred_ui_language;

  BEGIN
    UPDATE public.profiles
    SET
      email = profile_email,
      first_name = COALESCE(profile_first_name, profiles.first_name),
      last_name = COALESCE(profile_last_name, profiles.last_name),
      user_role = COALESCE(profile_user_role, profiles.user_role),
      company_id = COALESCE(profile_company_id, profiles.company_id),
      is_admin = profile_is_admin,
      user_status = profile_user_status,
      preferred_ui_language = profile_preferred_ui_language,
      updated_at = now()
    WHERE
      id = profile_id;

    IF NOT FOUND THEN
      RAISE NOTICE '[handle_new_invited_user] UPDATE found no existing profile for ID: %. Attempting INSERT.', profile_id;
      INSERT INTO public.profiles (
        id, email, first_name, last_name, user_role,
        company_id, is_admin, user_status, preferred_ui_language, created_at, updated_at
      )
      VALUES (
        profile_id, profile_email, profile_first_name, profile_last_name, profile_user_role,
        profile_company_id, profile_is_admin, profile_user_status, profile_preferred_ui_language,
        now(), now()
      );
      RAISE NOTICE '[handle_new_invited_user] Fallback INSERT successful for ID: %', profile_id;
    ELSE
      RAISE NOTICE '[handle_new_invited_user] UPDATE successful for ID: %', profile_id;
    END IF;

  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '[handle_new_invited_user] EXCEPTION during UPDATE/INSERT for ID: %. SQLSTATE: %, SQLERRM: %', profile_id, SQLSTATE, SQLERRM;
      RAISE;
  END;

  RETURN NEW;
END;
$$;

-- Create the trigger to call this function after a new user is inserted in auth.users
-- DROP TRIGGER IF EXISTS on_auth_user_invited_created ON auth.users; -- Keep commented unless known safe
CREATE TRIGGER on_auth_user_invited_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_invited_user();

COMMENT ON FUNCTION public.handle_new_invited_user() IS
'Handles creation or update of a public.profiles entry for new user created via invitation. Extracts metadata from NEW.raw_user_meta_data, attempts UPDATE first, then INSERT. Includes RAISE NOTICE logging.';
COMMENT ON TRIGGER on_auth_user_invited_created ON auth.users IS
'After a new user is created in auth.users (e.g. after accepting an invitation), create or update their corresponding profile in public.profiles.';

-- Advise user:
-- IMPORTANT: Review your existing trigger 'on_new_user_profile_created' on 'public.profiles'.
-- It appears to be designed for a different signup flow or profile creation process.
-- If users are now primarily added via invitation or a standard Supabase signup that creates an auth.users entry first,
-- the old trigger 'on_new_user_profile_created' might be redundant or could cause conflicts
-- (e.g., trying to update a profile that this new trigger already created/updated).
-- You may need to modify or remove it depending on your overall user management strategy.
-- The trigger 'handle_new_user_profile_setup' which is called by 'on_new_user_profile_created'
-- might still be relevant if you have other flows that insert directly into public.profiles first,
-- or if users can sign up without an invitation and then have their profile updated.
-- This new 'on_auth_user_invited_created' trigger is specifically for the invite flow.
