-- Function to let an authenticated user delete their own auth record.
-- SECURITY DEFINER runs with the privileges of the function owner (postgres),
-- which has permission to delete from auth.users.
CREATE OR REPLACE FUNCTION delete_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Deleting from auth.users cascades to all user data via FK constraints.
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$;

-- Only authenticated users can call this function, and it only ever
-- deletes the row matching their own auth.uid().
REVOKE ALL ON FUNCTION delete_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION delete_user() TO authenticated;
