-- supabase/migrations/YYYYMMDDHHMMSS_add_rls_for_task_properties.sql

-- Ensure RLS is enabled on the properties table.
-- If it's not, the user needs to enable it in Supabase Dashboard:
-- Authentication -> Policies -> properties table -> Enable RLS.
-- This script assumes RLS is already enabled, as other policies exist.

-- RLS Policy: Allow users to read property details if they are assigned to a task on that property.
CREATE POLICY "Allow assigned users to read property details for their tasks"
ON public.properties
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.tasks t -- Assuming your tasks table is named 'tasks'
    WHERE
      t.property_id = properties.id AND -- Links the property to a task on this property
      t.staff_id = auth.uid()        -- Links that task to the currently authenticated user
      -- Ensure 't.property_id' correctly references 'properties.id'
      -- Ensure 't.staff_id' correctly references the user ID (auth.uid())
  )
);

COMMENT ON POLICY "Allow assigned users to read property details for their tasks" ON public.properties IS
'Allows authenticated users to select property details if they are assigned to a task associated with that property.';

-- IMPORTANT NOTES FOR USER (to be communicated separately, but good to have in mind):
-- 1. Table and Column Names:
--    - This policy assumes your tasks table is named `public.tasks`.
--    - It assumes `public.tasks` has a column `property_id` that is a foreign key to `public.properties.id`.
--    - It assumes `public.tasks` has a column `staff_id` that stores the UUID of the assigned user (matching `auth.uid()`).
--    If your table or column names are different, you MUST adjust this policy definition accordingly.
--
-- 2. Existing Policies:
--    This policy is additive. If other SELECT policies exist on `public.properties` (like the admin/owner one),
--    a user only needs to satisfy ONE of them to gain access. For example, an admin will still see all properties
--    via their existing "Allow read access to properties of owned companies" policy, and also any properties
--    they happen to be assigned tasks for via this new policy.
--
-- 3. Performance:
--    The `EXISTS` subquery is generally efficient, especially if there are indexes on
--    `tasks.property_id` and `tasks.staff_id`.
--
-- 4. Testing:
--    After applying, test thoroughly by logging in as a regular staff user assigned to a task.
--    They should now see the property name for that task.
--    Also test that they CANNOT see property names for tasks they are NOT assigned to,
--    and cannot directly query properties they have no task linkage to (unless another RLS policy grants it).
