-- supabase/migrations/YYYYMMDDHHMMSS_rls_detailed_task_assignments_view.sql

-- Ensure RLS is enabled on the detailed_task_assignments view.
-- (User will need to enable this in Supabase Dashboard if it's a new view:
--  Authentication -> Policies -> detailed_task_assignments view -> Enable RLS)
-- However, views often inherit RLS from underlying tables or require specific grants.
-- For views, RLS is often more about what rows IT can access from underlying tables
-- based on the *view definer's* rights if it's SECURITY DEFINER, or the *invoker's* rights.
-- Let's assume we are defining policies directly ON THE VIEW for the current invoker.

-- Policy 1: Allow users to see their own detailed assignments.
CREATE POLICY "Allow user to see their own detailed assignments"
ON public.detailed_task_assignments
FOR SELECT
TO authenticated
USING (assignee_user_id = auth.uid()); -- 'assignee_user_id' is from the view definition

COMMENT ON POLICY "Allow user to see their own detailed assignments" ON public.detailed_task_assignments IS
'Allows authenticated users to select their own assignment details from the view.';

-- Policy 2: Allow admins to see detailed assignments of users within their own company.
-- This mirrors the user's existing "Admin can read task assignments in own company" logic.
CREATE POLICY "Admin can read detailed assignments of users in their company"
ON public.detailed_task_assignments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p_admin
    WHERE
      p_admin.id = auth.uid() AND
      p_admin.is_admin = TRUE AND
      p_admin.company_id IS NOT NULL AND
      p_admin.company_id = (
        SELECT p_assignee.company_id
        FROM public.profiles p_assignee
        WHERE p_assignee.id = detailed_task_assignments.assignee_user_id -- 'assignee_user_id' from the view
      )
  )
);

COMMENT ON POLICY "Admin can read detailed assignments of users in their company" ON public.detailed_task_assignments IS
'Allows admin users to see detailed task assignments if the assigned user (assignee) belongs to the same company as the admin. Assumes admin profile has company_id set.';

-- IMPORTANT NOTES FOR USER (to be communicated separately):
-- 1. Enable RLS on View: The user MUST ensure RLS is enabled for the `detailed_task_assignments` view itself in the Supabase dashboard.
-- 2. Column Names: Assumes `assignee_user_id` is the column in the view representing the assigned user's ID.
-- 3. Completeness: These two policies cover users seeing their own, and admins seeing assignments for users in their company.
--    If a "Company Owner" (who might not be an `is_admin=true` user) needs broader access than just their *own* assignments,
--    a separate policy for them might be needed, carefully designed to avoid recursion.
--    For now, this setup prioritizes safety from recursion.
--
-- 4. Underlying Table RLS: RLS policies on the underlying tables (`task_assignments`, `profiles`)
--    are still evaluated when the view is accessed by the user calling the view, unless the view is SECURITY DEFINER.
--    Our view is not SECURITY DEFINER by default.
--    The RLS policy "Allow user to see their own task assignments" on `task_assignments` (`USING (user_id = auth.uid())`)
--    and "Profiles - Allow user to read own data" on `profiles` (`USING (auth.uid() = id)`)
--    and "Profiles - Allow user to view colleagues in same company" on `profiles`
--    are important for these view policies to work correctly when a user accesses the view.
