-- supabase/migrations/20240514103800_create_detailed_task_assignments_view.sql

-- Drop the existing view if it exists
DROP VIEW IF EXISTS public.detailed_task_assignments;

-- Create the new view with additional joins and columns
CREATE VIEW public.detailed_task_assignments AS
SELECT
    ta.id AS assignment_id,
    ta.assigned_at,
    t.task_id,
    t.task_title,
    t.task_description,
    t.task_status,
    t.task_priority,
    t.task_due_date,
    t.task_notes,
    t.created_by AS task_created_by,
    t.company_id AS task_company_id,
    p.id AS assignee_user_id,
    p.first_name AS assignee_first_name,
    p.last_name AS assignee_last_name,
    p.email AS assignee_email,
    prop.id AS property_id,
    prop.property_name AS property_name,
    prop.address AS address
FROM
    public.task_assignments ta
JOIN
    public.profiles p ON ta.user_id = p.id
JOIN
    public.tasks t ON ta.task_id = t.task_id
JOIN
    public.properties prop ON t.property_id = prop.id;

-- Add a comment to the view explaining its purpose
COMMENT ON VIEW public.detailed_task_assignments IS
'Provides a comprehensive view of task assignments, joining task_assignments with profiles, tasks, and properties to include details about the task, assignee, and associated property.';

-- Example of how to query this view (for information, not part of migration):
-- SELECT task_title, assignee_first_name, property_name
-- FROM public.detailed_task_assignments
-- WHERE assignee_user_id = 'some_user_uuid';
