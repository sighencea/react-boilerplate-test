# Project Overview: Property Hub Management System

## 1. General Project Overview

### 1.1. Purpose
Property Hub is a web application designed for property management agencies and related businesses. It provides a centralized platform to manage properties, associated tasks (including notes and file attachments), staff members, and company administration, streamlining operations and improving efficiency.

### 1.2. Key Features
*   User Authentication: Secure sign-up, sign-in, and session management.
*   Multi-Company Support: Designed for agencies to manage their specific portfolio.
*   Company Setup: Workflow for new agency admins to register and set up their company details, including a verification code step.
*   Staff Management: Admins can invite, view, and edit staff member profiles within their company.
*   Property Management: Functionality to add, view, and manage property details.
*   Task Management:
    *   Creation of tasks with title, description, status, priority, due date, and assignee.
    *   Viewing detailed task information in a modal.
    *   Editing tasks, including all core fields.
    *   **Task Notes:** Ability to add and edit a single text-based note per task.
    *   **File Attachments:** Ability to upload multiple images (e.g., for proof of work) and multiple documents (e.g., certificates) per task. Ability to soft-delete these attachments.
*   User Profile Management: Users can edit their own profile information.
*   Role-Based Access Control: Strict permissions differentiate what admins and staff members can see and do, enforced by Supabase Row Level Security (RLS).
*   Dynamic Dashboard: Admin dashboard displays real-time counts of company properties, tasks (by status: New, In Progress, Completed), and staff (total and by key roles like Electrician, Plumber, Cleaner, Contractor). Shows conditional messages for zero-count states.
*   Internationalization (i18n): Supports multiple languages for the user interface.

### 1.3. User Roles
*   **Administrator (Admin):**
    *   Typically the agency owner or manager.
    *   Manages company settings.
    *   Full CRUD operations on staff members within their company.
    *   Full CRUD operations on properties belonging to their company.
    *   Full CRUD operations on tasks within their company, including assignment, notes, and file attachments.
    *   Has a comprehensive view of all data pertaining to their company.
*   **Staff Member (Non-Admin):**
    *   Invited to join a company by an Admin.
    *   Views and manages tasks assigned to them. This includes editing task status, notes, and managing file attachments for their assigned tasks.
    *   Manages their own user profile.
    *   Access to other data (like full staff lists or other users' tasks they are not assigned to) is restricted.

### 1.4. Technical Stack
*   **Frontend:** HTML, CSS, JavaScript
*   **UI Framework:** Bootstrap 5
*   **Internationalization:** i18next
*   **Backend & Database:** Supabase
    *   PostgreSQL for data storage.
    *   Supabase Auth for user authentication.
    *   Supabase Storage for file uploads (images, documents).
    *   Row Level Security (RLS) extensively used for data protection.
    *   Supabase Edge Functions for specific backend logic (e.g., inviting staff, creating tasks).

### 1.5. Key Database Tables & Storage
*   **`public.profiles`**: Stores user information, roles (`is_admin`), company affiliation (`company_id`), status, verification codes.
*   **`public.companies`**: Stores company details, linked to an owner.
*   **`public.properties`**: Stores property details, linked to `companies`.
*   **`public.tasks`**: Stores task information, linked to `properties`, `task_assignments`. Includes new `task_notes TEXT` column.
*   **`public.task_assignments`**: Links tasks to assigned staff users (`user_id`).
*   **`public.task_files` (New Table):**
    *   `id` (UUID, PK)
    *   `task_id` (UUID, FK to `public.tasks.task_id`)
    *   `file_name` (TEXT)
    *   `storage_path` (TEXT, UNIQUE path in Supabase Storage)
    *   `mime_type` (TEXT)
    *   `file_size` (INTEGER, bytes)
    *   `uploaded_by` (UUID, FK to `auth.users.id`)
    *   `uploaded_at` (TIMESTAMPTZ, default `now()`)
    *   `is_deleted` (BOOLEAN, default `false` for soft deletes)
*   **`public.detailed_task_assignments` (Function):** Aggregates task assignment details for display.
*   **Supabase Storage Buckets (Private):**
    *   `task-images`: Stores images attached to tasks.
    *   `task-documents`: Stores documents attached to tasks.

### 1.6. General RLS Strategy
*   Users primarily access/modify their own data (e.g., own `profiles` row, own `task_assignments`).
*   Admins have broader access restricted to their `company_id`.
*   JWT metadata (`app_metadata` for `is_admin`, `company_id`) is crucial, accessed via SQL helper functions (`public.current_user_is_admin()`, `public.current_user_company_id()`) for reliable, non-recursive RLS policies on `profiles`.
*   RLS for file operations (metadata in `task_files`, objects in Storage) ensures users can only manage files for tasks they have appropriate rights to (viewing or editing).

---

## 2. Recent Updates: RLS Overhaul, Bug Fixing & Feature Enhancement

### 2.1. Summary
This cycle focused on a critical overhaul of Row Level Security (RLS) policies to resolve application-wide "infinite recursion" errors, primarily on the `profiles` table. This involved extensive debugging, refactoring RLS with JWT-based helper functions, and systematic re-enablement of policies. Concurrently, significant new features were added to task management: allowing users to add textual notes and attach multiple images and documents to tasks. Several UI and logic bugs related to RLS and form handling were also addressed. The outcome is a more stable, secure, and feature-rich application.

### 2.2. Challenges Faced
*   **Pervasive RLS Recursion:**
    *   Initial state: "Infinite recursion" on `profiles` table RLS, blocking sign-in and most data access.
    *   Secondary recursion errors on `tasks` and `task_assignments` when initial JWT-based fixes for `profiles` were extended to these tables.
*   **Data Update Issues:**
    *   `PGRST116` ("JSON object requested, multiple (or no) rows returned") error when admins updated staff profiles, due to RLS conflicts with the `.select().single()` PostgREST behavior.
    *   Silent update failures where UI indicated success but data wasn't saved, primarily due to missing or misconfigured RLS `UPDATE` policies (e.g., admin staff edits, new agency verification code).
*   **UI & JavaScript Bugs:**
    *   Unresponsive "Save Changes" button in staff edit modal (HTML form structure).
    *   Repeated `SyntaxError: Identifier 'li' has already been declared` in `tasks-display.js` due to incorrect variable scoping in loops.
*   **Incomplete RLS Definitions:** Several `UPDATE` RLS policies had truncated/incomplete `WITH CHECK` clauses, causing errors during new agency admin signup verification.

### 2.3. How We Tackled the Challenges
1.  **Isolation & JWT for `profiles` RLS:** Systematically debugged `profiles` RLS. Introduced `public.current_user_is_admin()` and `public.current_user_company_id()` functions reading JWT `app_metadata` to make admin `SELECT` policies on `profiles` non-recursive.
2.  **Policy Reconstruction:** Rebuilt problematic `profiles` RLS policies (especially `"Admins can view staff in their company (JWT)"`) using these JWT functions.
3.  **Systematic Re-enablement:** After stabilizing `profiles` RLS and sign-in, other RLS policies for `profiles` (`INSERT`, `UPDATE`, other `SELECT`) and then for related tables (`tasks`, `task_assignments`) were reviewed and re-enabled/reinstated one by one, with testing at each phase.
4.  **Addressing Specific Errors:**
    *   `PGRST116` on staff update: Modified the JavaScript `updateStaffMember` function to remove `.select().single()` entirely, relying on a list refresh after a successful error-free update call.
    *   Incomplete `WITH CHECK` clauses: Corrected syntactically incomplete `WITH CHECK` clauses in several `UPDATE` RLS policies on `profiles`.
    *   Missing Admin `UPDATE` Policy: Identified and created the necessary `"Profiles - Allow admin to update staff in own company"` policy.
    *   Modal Button Fix: Corrected HTML in `pages/staff.html` by ensuring the form tag wrapped the modal footer and changing the save button to `type="submit"`.
    *   `SyntaxError` in `tasks-display.js`: Corrected duplicate `li` variable declarations after multiple attempts.
5.  **Clarification of RLS on Functions vs. Views:** Distinguished that `detailed_task_assignments` was a function, not a view, guiding RLS strategy to focus on its underlying tables.
6.  **New Task Features (Notes & Files):** Implemented database changes (`tasks.task_notes` column, `task_files` table), Supabase Storage buckets (`task-images`, `task-documents`), RLS for these new structures and storage, and frontend HTML/JS for viewing, editing, uploading, and deleting notes and files in task modals.

### 2.4. Features Implemented/Restored/Enhanced
*   **Resolved RLS Recursion:** Application is now stable, sign-in and data fetching work reliably.
*   **Task Notes:** Users can add and edit a single text note per task.
*   **Task File Attachments:**
    *   Users can upload multiple images and documents to tasks.
    *   Files are stored in Supabase Storage.
    *   File metadata is tracked in `task_files` table.
    *   Users can "soft delete" attachments.
*   **Enhanced Task Modals:**
    *   "View Task Modal" displays notes and lists attached files.
    *   "Edit Task Modal" allows editing of notes, uploading new files, and deleting existing files, alongside other task fields.
*   **Robust Admin Functionality:** Admins can correctly view and manage staff, tasks, and task assignments within their company.
*   **Corrected User Self-Service:** Users can edit their own profiles; new user/agency signup verification works.
*   **Staff Invitation Flow:** Confirmed working.
*   **Enhanced Admin Dashboard:** Implemented dynamic data display for counts of properties, tasks (by status), and staff (total and by role), replacing static placeholders.

### 2.5. Summary of Key Active RLS Policies
*   **`public.profiles`:**
    *   `SELECT`: `"Profiles - Allow user to read own data"`, `"Admins can view staff in their company (JWT)"`.
    *   `INSERT`: `"Profiles - Allow admin to insert staff in their own company"`, `"Profiles - Allow user to insert own initial profile"`.
    *   `UPDATE`: `"Profiles - Allow user to update own profile (restricted)"`, `"Profiles - Allow admin to update staff in own company"`, `"Allow users to update own language preference"`.
*   **`public.tasks`:**
    *   `SELECT (User)`: `"Allow users to view their assigned tasks (v2)"`.
    *   `SELECT (Admin/Owner)`: `"Allow read access to tasks of owned companies"`.
    *   `UPDATE (User)`: `"Allow assigned users to update task details"`.
    *   `UPDATE (Admin/Owner)`: `"Allow update access to tasks of owned companies"`.
*   **`public.task_assignments`:**
    *   `SELECT (User)`: `"Allow user to see their own task assignments"`.
    *   `SELECT (Admin)`: `"Admin can read task assignments in own company"`.
    *   `SELECT (Owner)`: `"Allow company owner to read task assignments in their company"`.
*   **`public.task_files` (New):**
    *   `SELECT`: `"Allow users to see files for tasks they can access"`.
    *   `INSERT`: `"Allow users to insert file metadata for tasks they can edit"`.
    *   `UPDATE`: `"Allow users to soft delete files for tasks they can edit"`.
*   **Supabase Storage (`task-images`, `task-documents` buckets - using path `USER_ID/TASK_ID/FILENAME`):**
    *   `SELECT (Download)`: `"Allow download from task-images if task accessible"` (and equivalent for documents).
    *   `INSERT (Upload)`: `"Allow upload to task-images for editable tasks"` (and equivalent for documents).
    *   `DELETE`: `"Allow delete from task-images by uploader or admin"` (and equivalent for documents).
    *   `UPDATE`: `"Allow uploader to update images for editable tasks"` (and equivalent for documents).

### 2.6. Triggers Implemented
*   **`on_new_user_profile_created`** on `profiles` (`AFTER INSERT`): Calls `handle_new_user_profile_setup` (`SECURITY DEFINER`).

### 2.7. Edge Functions Implemented (Relevant Inferred)
*   `invite-staff-member`, `create-task`, `activate-profile`, `save-company-details`.

### 2.8. Website Operation Overview
Authentication via Supabase Auth. New agency admins verify and set up company. Admins (`is_admin` in JWT) manage their `company_id` data. Staff access is restricted. Task notes and files are managed via modals, with files stored in private Supabase Storage buckets and metadata in `task_files`. RLS heavily governs data visibility and modification rights.

### 2.9. Open Bugs (Identified during this process)
*   User mentioned two minor, non-critical items to be addressed later.

### 2.10. Next Steps Planned
*   Address any minor bugs identified by the user.
*   User final review and approval of this document from the repository.
*   Ensure all database changes (new `task_notes` column, `task_files` table, all RLS policies for tables and storage) are scripted as Supabase migrations for version control and future environment setups.
*   Ongoing monitoring of application stability and RLS performance.

### Dynamic Dashboard Enhancements

Future updates will focus on making the dashboard (`pages/dashboard.html`) dynamic:

*   **Properties Card:**
    *   Fetch and display the actual count of properties associated with the admin's company.
    *   Display a message like "You don't have any properties set up yet." if the count is zero.
*   **Tasks Card:**
    *   Fetch and display counts of tasks for the admin's company, broken down by status: 'New', 'In Progress', and 'Completed'.
    *   Display '0' if a status has no tasks.
    *   Display a general message if there are no tasks in these categories.
*   **Staff Card:**
    *   Fetch and display the total number of staff (non-admins) in the admin's company.
    *   Display a message like "You don't have any staff members yet." if the total is zero.
    *   Provide a breakdown of staff counts by specific roles: 'Electrician', 'Plumber', 'Cleaner'.
    *   Provide a count for 'Contractor' roles separately.
    *   Display '0' for role counts if applicable.
*   **Implementation Approach:**
    *   Three new PostgreSQL RPC functions will be created (`get_company_property_count`, `get_company_task_counts_by_status`, `get_company_staff_counts_by_role`). These will use the existing JWT-based helper functions (`public.current_user_is_admin()`, `public.current_user_company_id()`) to ensure data is scoped to the admin's company.
    *   The JavaScript file `js/dashboard_check.js` (or a new dedicated dashboard script) will be updated to call these RPCs and populate the dashboard HTML elements.
*   **Localization:** All new static and dynamic text elements introduced on the dashboard will be added to localization files (`locales/en.json`, `locales/de.json`) for translation.
