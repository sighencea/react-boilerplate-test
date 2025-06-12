-- supabase/migrations/YYYYMMDDHHMMSS_update_status_on_login_trigger.sql

-- Function to update profile status to 'Active' when an 'Invited' user signs in
CREATE OR REPLACE FUNCTION public.handle_user_sign_in_update_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- May not be strictly necessary if it only updates public.profiles based on auth.users.id, but good practice.
AS $$
BEGIN
  -- Check if last_sign_in_at actually changed and was not null before (or was null and is now not null)
  -- This helps ensure it's a genuine new sign-in event for this specific timestamp.
  -- And more importantly, that NEW.last_sign_in_at is not null.
  IF NEW.last_sign_in_at IS NOT NULL AND (OLD.last_sign_in_at IS NULL OR NEW.last_sign_in_at <> OLD.last_sign_in_at) THEN
    RAISE NOTICE '[handle_user_sign_in_update_status] User signed in: %, old_last_sign_in: %, new_last_sign_in: %',
        NEW.id, OLD.last_sign_in_at, NEW.last_sign_in_at;

    UPDATE public.profiles
    SET
      user_status = 'Active',
      updated_at = now()
    WHERE
      id = NEW.id AND
      user_status = 'Invited'; -- Only update if current status is 'Invited'

    IF FOUND THEN
      RAISE NOTICE '[handle_user_sign_in_update_status] Profile status updated to Active for user ID: %', NEW.id;
    ELSE
      RAISE NOTICE '[handle_user_sign_in_update_status] Profile for user ID: % not updated (either not found or status was not Invited).', NEW.id;
    END IF;
  ELSE
    RAISE NOTICE '[handle_user_sign_in_update_status] No relevant change in last_sign_in_at for user ID: % (new: %, old: %)',
        NEW.id, NEW.last_sign_in_at, OLD.last_sign_in_at;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_user_sign_in_update_status() IS
'When a user signs in (auth.users.last_sign_in_at is updated), if their profile status was ''Invited'', update it to ''Active''.';

-- Drop the trigger if it already exists, to ensure it's fresh (optional, but good for development)
DROP TRIGGER IF EXISTS on_user_sign_in_set_profile_active ON auth.users;

-- Create the trigger
CREATE TRIGGER on_user_sign_in_set_profile_active
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_sign_in_update_status();

COMMENT ON TRIGGER on_user_sign_in_set_profile_active ON auth.users IS
'On user sign-in, updates their profile status from ''Invited'' to ''Active'' if applicable.';
