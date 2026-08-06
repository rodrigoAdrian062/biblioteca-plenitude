-- Revoke execute on security definer functions from public and authenticated roles
-- as identified by the linter warning 0029.
-- These functions should only be called by the system or internal policies.

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;

REVOKE EXECUTE ON FUNCTION public.current_degree() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_degree() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.current_degree() FROM anon;

-- Grant to service_role so system functions and admin client can still use them if needed
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.current_degree() TO service_role;
