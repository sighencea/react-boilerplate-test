-- supabase/migrations/YYYYMMDDHHMMSS_unified_profile_creation_trigger.sql

-- Drop the old trigger function and trigger for invited users if they exist
DROP FUNCTION IF EXISTS public.handle_new_invited_user();
-- The trigger on_auth_user_invited_created will be dropped by dropping the function if it was the only one using it,
-- or can be dropped explicitly:
DROP TRIGGER IF EXISTS on_auth_user_invited_created ON auth.users;

-- Also, ensure the user's very old trigger on public.profiles is definitely disabled or dropped.
-- Advise user: ALTER TABLE public.profiles DISABLE TRIGGER on_new_user_profile_created;
-- OR DROP TRIGGER IF EXISTS on_new_user_profile_created ON public.profiles;

-- New unified trigger function
CREATE OR REPLACE FUNCTION public.initialize_profile_from_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  meta_app JSONB;         -- For data from admin invitation (inviteUserByEmail data field)
  meta_user JSONB;        -- For data from client self-signup (signUp options.data field)

  profile_id UUID; -- Declared profile_id as it's used
  profile_first_name TEXT;
  profile_last_name TEXT;
  profile_email TEXT;
  profile_user_role TEXT;
  profile_company_id UUID;
  profile_is_admin BOOLEAN;
  profile_user_status TEXT;
  profile_has_company_set_up BOOLEAN;
  profile_preferred_ui_language TEXT;

  is_invite BOOLEAN := FALSE;
  account_type TEXT;
BEGIN
  RAISE NOTICE '[initialize_profile_from_auth_user] Trigger fired for new user ID: %, Email: %', NEW.id, NEW.email;

  meta_app := NEW.raw_app_meta_data;
  meta_user := NEW.raw_user_meta_data;

  RAISE NOTICE '[initialize_profile_from_auth_user] App Metadata: %', meta_app;
  RAISE NOTICE '[initialize_profile_from_auth_user] User Metadata: %', meta_user;

  profile_id := NEW.id;
  profile_email := NEW.email;

  -- Check if this is an invite by looking for invite-specific markers in app_meta_data
  -- (user_role and company_id are good markers as they are set by our invite-staff-member function)
  IF meta_app IS NOT NULL AND meta_app ? 'user_role' AND meta_app ? 'company_id' THEN
    is_invite := TRUE;
  END IF;

  IF is_invite THEN
    RAISE NOTICE '[initialize_profile_from_auth_user] Detected INVITED USER flow.';
    profile_first_name := meta_app ->> 'first_name';
    profile_last_name := meta_app ->> 'last_name';
    profile_user_role := meta_app ->> 'user_role';
    profile_company_id := (meta_app ->> 'company_id')::UUID;
    profile_is_admin := COALESCE((meta_app ->> 'is_admin')::BOOLEAN, FALSE); -- Should be false from invite
    profile_user_status := COALESCE(meta_app ->> 'user_status', 'Invited'); -- Should be 'Invited' from invite
    profile_has_company_set_up := COALESCE((meta_app ->> 'has_company_set_up')::BOOLEAN, FALSE); -- Typically false for invited staff
    profile_preferred_ui_language := COALESCE((meta_app ->> 'preferred_ui_language')::TEXT, 'en');
  ELSE
    RAISE NOTICE '[initialize_profile_from_auth_user] Detected SELF-SIGNUP flow.';
    -- This is a self-signup, get data from user_meta_data
    profile_first_name := meta_user ->> 'first_name';
    profile_last_name := meta_user ->> 'last_name'; -- Might be null for self-signup initially

    account_type := meta_user ->> 'account_type';
    RAISE NOTICE '[initialize_profile_from_auth_user] Self-signup account_type: %', account_type;

    IF account_type = 'agency' THEN
      profile_is_admin := TRUE;
      profile_has_company_set_up := FALSE;
      profile_user_status := 'New'; -- Or 'Active' depending on email verification settings
      profile_user_role := 'Admin'; -- Default role for new agency admin
    ELSE -- Standard user self-signup (or if account_type is null/different)
      profile_is_admin := FALSE;
      profile_has_company_set_up := FALSE; -- Non-agencies don't set up companies
      profile_user_status := 'New';
      profile_user_role := 'User'; -- Default role for other users
    END IF;

    profile_company_id := NULL; -- Not typically set at self-signup, unless part of a specific flow not covered here
    profile_preferred_ui_language := COALESCE((meta_user ->> 'preferred_ui_language')::TEXT, 'en');
  END IF;

  RAISE NOTICE '[initialize_profile_from_auth_user] Determined values: email=%L, fname=%L, lname=%L, role=%L, comp_id=%L, is_admin=%L, status=%L, has_comp_setup=%L, lang=%L',
    profile_email, profile_first_name, profile_last_name, profile_user_role, profile_company_id, profile_is_admin, profile_user_status, profile_has_company_set_up, profile_preferred_ui_language;

  BEGIN
    -- Try to UPDATE first, in case a minimal profile was already created by Supabase default hook
    UPDATE public.profiles
    SET
      email = profile_email,
      first_name = COALESCE(profile_first_name, profiles.first_name),
      last_name = COALESCE(profile_last_name, profiles.last_name),
      user_role = COALESCE(profile_user_role, profiles.user_role),
      company_id = COALESCE(profile_company_id, profiles.company_id),
      is_admin = profile_is_admin,
      user_status = profile_user_status,
      has_company_set_up = COALESCE(profile_has_company_set_up, profiles.has_company_set_up),
      preferred_ui_language = profile_preferred_ui_language,
      updated_at = now()
    WHERE
      id = profile_id;

    IF NOT FOUND THEN
      RAISE NOTICE '[initialize_profile_from_auth_user] No existing profile found for ID: %. Inserting new profile.', profile_id;
      INSERT INTO public.profiles (
        id, email, first_name, last_name, user_role, company_id,
        is_admin, user_status, has_company_set_up, preferred_ui_language,
        created_at, updated_at
      )
      VALUES (
        profile_id, profile_email, profile_first_name, profile_last_name, profile_user_role, profile_company_id,
        profile_is_admin, profile_user_status, profile_has_company_set_up, profile_preferred_ui_language,
        now(), now()
      );
      RAISE NOTICE '[initialize_profile_from_auth_user] New profile INSERT successful for ID: %', profile_id;
    ELSE
      RAISE NOTICE '[initialize_profile_from_auth_user] Existing profile UPDATE successful for ID: %', profile_id;
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '[initialize_profile_from_auth_user] EXCEPTION during UPDATE/INSERT for ID: %. SQLSTATE: %, SQLERRM: %', profile_id, SQLSTATE, SQLERRM;
      RAISE;
  END;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_initialize_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.initialize_profile_from_auth_user();

COMMENT ON FUNCTION public.initialize_profile_from_auth_user() IS
'Handles profile creation/update in public.profiles when a new user is added to auth.users. Differentiates between invited users (reads from raw_app_meta_data) and self-signed-up users (reads from raw_user_meta_data) to set fields like is_admin, company_id, user_role, and user_status.';
COMMENT ON TRIGGER on_auth_user_created_initialize_profile ON auth.users IS
'After a new user is created in auth.users, ensures their corresponding profile in public.profiles is correctly initialized or updated.';
