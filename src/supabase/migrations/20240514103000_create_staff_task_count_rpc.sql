-- supabase/migrations/20240514103000_create_staff_task_count_rpc.sql

CREATE OR REPLACE FUNCTION get_staff_for_company_with_task_counts(p_company_id UUID)
RETURNS TABLE (
    id UUID,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    user_role TEXT,
    user_status TEXT,
    assigned_tasks_count BIGINT,
    is_owner BOOLEAN
)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check if the companies table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'companies'
    ) THEN
        RAISE WARNING 'Companies table not found. Cannot determine ownership. Returning staff without owner status or task counts.';
        RETURN QUERY
            SELECT
                p.id,
                p.first_name,
                p.last_name,
                p.email,
                p.user_role,
                p.user_status,
                0::BIGINT AS assigned_tasks_count,
                FALSE AS is_owner
            FROM
                profiles p
            WHERE
                p.company_id = p_company_id;
    -- Check if the task_assignments table exists
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'task_assignments' -- Changed table name
    ) THEN
        RAISE WARNING 'Table task_assignments not found. Returning 0 for task counts.';
        RETURN QUERY
        SELECT
            p.id,
            p.first_name,
            p.last_name,
            p.email,
            p.user_role,
            p.user_status,
            0::BIGINT AS assigned_tasks_count,
            (p.id = c.owner_id) AS is_owner
        FROM
            profiles p
        JOIN
            companies c ON p.company_id = c.id
        WHERE
            p.company_id = p_company_id;
    -- Check if user_id column exists in task_assignments table
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'task_assignments' AND column_name = 'user_id' -- Changed column name
    ) THEN
        RAISE WARNING 'Column user_id does not exist in task_assignments table. Returning 0 for task counts.';
        RETURN QUERY
        SELECT
            p.id,
            p.first_name,
            p.last_name,
            p.email,
            p.user_role,
            p.user_status,
            0::BIGINT AS assigned_tasks_count,
            (p.id = c.owner_id) AS is_owner
        FROM
            profiles p
        JOIN
            companies c ON p.company_id = c.id
        WHERE
            p.company_id = p_company_id;
    ELSE
        -- If all tables and columns exist, proceed with the full join logic
        RETURN QUERY
        SELECT
            p.id,
            p.first_name,
            p.last_name,
            p.email,
            p.user_role,
            p.user_status,
            COUNT(t.task_id) AS assigned_tasks_count, -- Changed COUNT(t.id) to COUNT(t.task_id)
            (p.id = c.owner_id) AS is_owner
        FROM
            profiles p
        JOIN
            companies c ON p.company_id = c.id
        LEFT JOIN
            task_assignments t ON p.id = t.user_id -- Changed JOIN condition
        WHERE
            p.company_id = p_company_id
        GROUP BY
            p.id, p.first_name, p.last_name, p.email, p.user_role, p.user_status, c.owner_id;
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION get_staff_for_company_with_task_counts(UUID) TO authenticated;

COMMENT ON FUNCTION get_staff_for_company_with_task_counts(UUID) IS
'Retrieves staff members for a given company ID with a count of their assigned tasks (from task_assignments table) and an is_owner flag.
If task_assignments table or its user_id column does not exist, it returns staff with 0 task count.
If the companies table doesn''t exist, is_owner will be false and a warning raised.';
