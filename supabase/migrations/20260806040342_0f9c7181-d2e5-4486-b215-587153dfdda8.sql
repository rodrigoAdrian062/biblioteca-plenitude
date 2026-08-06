-- SECURE SECURITY DEFINER FUNCTIONS
-- Revoke PUBLIC execute permissions to satisfy the linter and follow best practices.
-- We use a more robust way to handle functions that might or might not exist.

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;
