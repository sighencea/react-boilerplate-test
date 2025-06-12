-- supabase/migrations/YYYYMMDDHHMMSS_rls_tasks_select_by_assignment.sql

-- Ensure RLS is enabled on the tasks table.
-- (User previously shared RLS policies for tasks, so it should be enabled.)

-- It's recommended to first DROP or ALTER the existing policy that grants users SELECT access based on tasks.staff_id
-- Example (user needs to verify the exact name of their old policy):
-- DROP POLICY IF EXISTS "Allow assigned users to read task" ON public.tasks;
-- Or, if they want to keep it for some reason and this new one is additive (less likely for this case):
-- Make sure the old policy is not overly permissive in a way that conflicts.

-- RLS Policy: Allow users to read tasks if they are assigned via the task_assignments table.
CREATE POLICY "Allow users to view tasks assigned via task_assignments"
ON public.tasks
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.task_assignments ta
    WHERE
      ta.task_id = tasks.task_id AND -- Corrected: tasks.task_id (assuming tasks PK is 'task_id')
      ta.user_id = auth.uid()   -- Links the assignment to the currently authenticated user
  )
);

COMMENT ON POLICY "Allow users to view tasks assigned via task_assignments" ON public.tasks IS
'Allows authenticated users to select tasks if they have an assignment record in the task_assignments table linking them to the task.';

-- IMPORTANT NOTES FOR USER (to be communicated separately):
-- 1. Table and Column Names:
--    - This policy assumes your tasks table primary key is `task_id`.
--    - It assumes `public.task_assignments` has `task_id` (referencing `tasks.task_id`) and `user_id` (referencing `auth.uid()`).
--    If your column names are different, you MUST adjust this policy definition.
--
-- 2. Replace Existing User SELECT Policy:
--    This policy is intended to be the primary way regular users see their tasks.
--    You likely have an existing policy (e.g., named "Allow assigned users to read task")
--    that uses `tasks.staff_id`. You should DROP or ALTER that old policy to avoid conflicts
--    or incorrect permissions, making this the new rule for assigned task visibility for users.
--    Admin/owner policies for viewing all tasks in a company would remain separate and still function.
