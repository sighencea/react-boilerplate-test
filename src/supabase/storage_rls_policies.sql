-- ## RLS Policies for 'profile-images' Bucket on `storage.objects` table
--
-- These policies allow authenticated users to manage their own profile images
-- within a folder structure based on their user ID (e.g., 'user_USERID/image.png').
--
-- Apply these policies via the Supabase SQL editor, targeting the `storage.objects` table.
-- Remember to replace 'profile-images' if your bucket name is different.

-- 1. Allow Authenticated Users to View their own Profile Images (SELECT)
-- Policy Name (Suggestion): Allow authenticated read access to own profile images
-- Target Roles: authenticated
-- Operation: SELECT
CREATE POLICY "Allow authenticated read access to own profile images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'profile-images' AND auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = ('user_' || auth.uid()::text));

-- 2. Allow Authenticated Users to Upload Profile Images to their Folder (INSERT)
-- Policy Name (Suggestion): Allow authenticated insert to own profile images folder
-- Target Roles: authenticated
-- Operation: INSERT
CREATE POLICY "Allow authenticated insert to own profile images folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'profile-images' AND auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = ('user_' || auth.uid()::text));

-- 3. Allow Authenticated Users to Update/Overwrite their own Profile Images (UPDATE)
-- Policy Name (Suggestion): Allow authenticated update to own profile images
-- Target Roles: authenticated
-- Operation: UPDATE
CREATE POLICY "Allow authenticated update to own profile images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'profile-images' AND auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = ('user_' || auth.uid()::text))
WITH CHECK (bucket_id = 'profile-images' AND auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = ('user_' || auth.uid()::text));

-- 4. Allow Authenticated Users to Delete their own Profile Images (DELETE)
-- Policy Name (Suggestion): Allow authenticated delete of own profile images
-- Target Roles: authenticated
-- Operation: DELETE
CREATE POLICY "Allow authenticated delete of own profile images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'profile-images' AND auth.uid() IS NOT NULL AND (storage.foldername(name))[1] = ('user_' || auth.uid()::text));

-- ## How to Apply via Supabase SQL Editor:
-- 1. Go to your Supabase project dashboard.
-- 2. Navigate to the "SQL Editor" (usually a tab with an icon like </>).
-- 3. Click "+ New query".
-- 4. Copy each `CREATE POLICY` statement above (one at a time, or all together) and paste it into the SQL editor.
-- 5. Click "RUN".
-- 6. Verify in Storage > [your-bucket] > Policies that the policies have been created.
--
-- Note: If policies with these exact names already exist from previous manual attempts,
-- you might need to `DROP POLICY "policy_name" ON storage.objects;` first, or edit them.
-- Using slightly different names for these new ones if you run them from SQL editor might be safer
-- if you're unsure about existing policies. For example, "Profile Images Select v2".
