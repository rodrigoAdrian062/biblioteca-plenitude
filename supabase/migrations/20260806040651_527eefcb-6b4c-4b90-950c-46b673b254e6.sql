-- Resolve linter warnings about SECURITY DEFINER functions accessible to signed-in users.
-- These functions are used in RLS policies, so they need to be executable by roles, 
-- but we restrict them to authenticated and service_role.

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.current_degree() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_degree() TO authenticated, service_role;
