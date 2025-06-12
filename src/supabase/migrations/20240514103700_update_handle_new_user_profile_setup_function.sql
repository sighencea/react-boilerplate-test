-- supabase/migrations/YYYYMMDDHHMMSS_update_handle_new_user_profile_setup_function.sql

CREATE OR REPLACE FUNCTION public.handle_new_user_profile_setup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  auth_user_record RECORD;
  -- meta_app JSONB; -- No longer primary source for differentiation logic, only meta_user
  meta_user JSONB;  -- Primary source of truth for all custom data

  profile_first_name TEXT;
  profile_last_name TEXT;
  profile_email TEXT;
  profile_user_role TEXT;
  profile_company_id UUID;
  profile_is_admin BOOLEAN;
  profile_user_status TEXT;
  profile_has_company_set_up BOOLEAN;
  profile_preferred_ui_language TEXT;

  account_type TEXT; -- For self-signups
BEGIN
  -- This trigger fires AFTER INSERT ON public.profiles.
  -- NEW.id is the id of the newly inserted profile row.
  SELECT * INTO auth_user_record FROM auth.users WHERE id = NEW.id;

  IF auth_user_record IS NULL THEN
    RAISE WARNING '[handle_new_user_profile_setup] No corresponding auth.users record found for profiles.id: %. Profile may not be fully populated.', NEW.id;
    RETURN NEW;
  END IF;

  meta_user := auth_user_record.raw_user_meta_data; -- All custom data comes from here
  profile_email := auth_user_record.email; -- Canonical email

  RAISE NOTICE '[handle_new_user_profile_setup] For profiles.id % (auth.users.id %): Processing raw_user_meta_data: %', NEW.id, auth_user_record.id, meta_user;

  -- Check for INVITE markers within raw_user_meta_data
  -- (Our Edge Function for invites now ensures its 'data' payload is merged into raw_user_meta_data by the time this trigger runs,
  -- or this trigger is the primary one and the old auth.users trigger is disabled)
  IF meta_user IS NOT NULL AND
     meta_user ? 'user_role' AND          -- Custom field for invited role
     meta_user ? 'company_id' AND         -- Custom field for invited company
     (meta_user ->> 'user_status') = 'Invited' -- Custom field indicating invite status
  THEN
    RAISE NOTICE '[handle_new_user_profile_setup] INVITED USER flow detected via raw_user_meta_data for profiles.id %', NEW.id;
    profile_first_name := meta_user ->> 'first_name';
    profile_last_name := meta_user ->> 'last_name';
    profile_user_role := meta_user ->> 'user_role';
    profile_company_id := (meta_user ->> 'company_id')::UUID;
    profile_is_admin := COALESCE((meta_user ->> 'is_admin')::BOOLEAN, FALSE);
    profile_user_status := 'Invited';
    profile_has_company_set_up := COALESCE((meta_user ->> 'has_company_set_up')::BOOLEAN, FALSE);
    profile_preferred_ui_language := COALESCE((meta_user ->> 'preferred_ui_language')::TEXT, 'en');
  ELSE
    -- SELF-SIGNUP flow (check for account_type also in raw_user_meta_data)
    RAISE NOTICE '[handle_new_user_profile_setup] SELF-SIGNUP flow detected for profiles.id %', NEW.id;
    profile_first_name := meta_user ->> 'first_name';
    profile_last_name := meta_user ->> 'last_name';

    account_type := meta_user ->> 'account_type';
    RAISE NOTICE '[handle_new_user_profile_setup] Self-signup account_type: %', account_type;

    IF account_type = 'agency' THEN
      profile_is_admin := TRUE;
      profile_has_company_set_up := FALSE;
      profile_user_status := 'New';
      profile_user_role := 'Admin';
    ELSE
      -- Default for other self-signups (non-agency)
      profile_is_admin := FALSE;
      profile_has_company_set_up := FALSE;
      profile_user_status := 'New';
      profile_user_role := 'User';
    END IF;

    profile_company_id := NULL; -- company_id is not set during self-signup
    profile_preferred_ui_language := COALESCE((meta_user ->> 'preferred_ui_language')::TEXT, 'en');
  END IF;

  RAISE NOTICE '[handle_new_user_profile_setup] Updating profiles.id % with: email=%L, fname=%L, lname=%L, role=%L, comp_id=%L, is_admin=%L, status=%L, has_comp_setup=%L, lang=%L',
    NEW.id, profile_email, profile_first_name, profile_last_name, profile_user_role, profile_company_id, profile_is_admin, profile_user_status, profile_has_company_set_up, profile_preferred_ui_language;

  UPDATE public.profiles
  SET
    email = profile_email,
    first_name = COALESCE(profile_first_name, NEW.first_name),
    last_name = profile_last_name,
    user_role = profile_user_role,
    company_id = profile_company_id,
    is_admin = profile_is_admin,
    user_status = profile_user_status,
    has_company_set_up = profile_has_company_set_up,
    preferred_ui_language = profile_preferred_ui_language,
    updated_at = now()
  WHERE
    id = NEW.id;

  RAISE NOTICE '[handle_new_user_profile_setup] Profile update for ID % completed.', NEW.id;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_user_profile_setup() IS
'AFTER INSERT ON public.profiles trigger. Populates profile using auth.users.raw_user_meta_data for both invites and self-signups. Differentiates based on fields like user_status=''Invited'' or account_type=''agency''. Ensures is_admin for agency.';

-- The user needs to ensure their trigger "on_new_user_profile_created" on "public.profiles"
-- correctly calls this updated function.
-- Example:
-- CREATE TRIGGER on_new_user_profile_created
--   AFTER INSERT ON public.profiles
--   FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile_setup();
-- (The user confirmed this trigger is already enabled and calls this function by name).
