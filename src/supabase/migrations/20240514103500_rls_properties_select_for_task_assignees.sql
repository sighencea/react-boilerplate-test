-- supabase/migrations/YYYYMMDDHHMMSS_rls_properties_select_for_task_assignees.sql

-- Ensure RLS is enabled on the properties table.

-- It's CRITICAL to DROP the temporary permissive policy first if it's still active:
-- DROP POLICY IF EXISTS "TEMP - Allow all authenticated to read properties" ON public.properties;
-- Also, the previously problematic policy "Allow assigned users to read property details for their tasks"
-- (the one that used tasks.staff_id) should have been dropped. If not, drop it too:
-- DROP POLICY IF EXISTS "Allow assigned users to read property details for their tasks" ON public.properties;

-- RLS Policy: Allow users to read property details if they are assigned (via task_assignments)
--             to a task that is on that property.
CREATE POLICY "Allow task assignees to read linked property details"
ON public.properties
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.tasks t
    JOIN public.task_assignments ta ON t.task_id = ta.task_id -- Corrected: t.task_id
    WHERE
      t.property_id = properties.id AND -- Links the task (which is linked to the assignment) to the property
      ta.user_id = auth.uid()         -- Links that assignment to the currently authenticated user
      -- Ensure 't.property_id' correctly references 'properties.id'
      -- Ensure 't.task_id' is the PK of tasks and 'ta.task_id' references it
      -- Ensure 'ta.user_id' correctly references the user ID (auth.uid())
  )
);

COMMENT ON POLICY "Allow task assignees to read linked property details" ON public.properties IS
'Allows authenticated users to select property details if they are assigned (via task_assignments table) to a task associated with that property.';

-- IMPORTANT NOTES FOR USER (to be communicated separately):
-- 1. Table and Column Names:
--    - Assumes tasks table is `public.tasks` with PK `task_id` and FK `property_id`.
--    - Assumes assignments table is `public.task_assignments` with `task_id` (referencing `tasks.task_id`) and `user_id` (referencing `auth.uid()`).
--    If your names differ, you MUST adjust this policy.
--
-- 2. Interaction with Other Policies:
--    This is additive. Admins will likely have broader access via other policies.
--    This policy specifically grants access to properties linked through a user's task assignments.
--
-- 3. Dropping Old/Temporary Policies:
--    Crucially, ensure the "TEMP - Allow all authenticated to read properties" policy is dropped before or when applying this.
--    Also, ensure any previous versions of "Allow assigned users to read property details for their tasks" are dropped.
