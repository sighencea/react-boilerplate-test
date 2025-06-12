-- supabase/migrations/YYYYMMDDHHMMSS_create_detailed_task_assignments_view.sql

DROP VIEW IF EXISTS public.detailed_task_assignments;

CREATE VIEW public.detailed_task_assignments AS
SELECT
  ta.id AS assignment_id, -- Renaming to avoid clash if task_id is also just 'id'
  ta.task_id,
  ta.user_id AS assignee_user_id, -- Renaming for clarity
  ta.assigned_at,
  p.first_name AS assignee_first_name,
  p.last_name AS assignee_last_name,
  p.email AS assignee_email -- Might be useful for display or contact
FROM
  public.task_assignments ta
JOIN
  public.profiles p ON ta.user_id = p.id;

COMMENT ON VIEW public.detailed_task_assignments IS
'Provides a detailed view of task assignments, joining task_assignments with profiles to include assignee first and last names and email.';

-- Example of how to query this view (for information, not part of migration):
-- SELECT task_id, assignee_first_name, assignee_last_name
-- FROM public.detailed_task_assignments
-- WHERE task_id = 'some_task_uuid';
