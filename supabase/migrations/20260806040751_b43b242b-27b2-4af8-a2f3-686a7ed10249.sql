-- 1. Secure the protect_profile_privileges function
-- This function is likely used in a trigger. We revoke public execution but allow authenticated/service_role.
REVOKE EXECUTE ON FUNCTION public.protect_profile_privileges() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.protect_profile_privileges() TO authenticated, service_role;

-- 2. Move it to the private schema as well for extra protection
ALTER FUNCTION public.protect_profile_privileges() SET SCHEMA private;
REVOKE ALL ON FUNCTION private.protect_profile_privileges() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.protect_profile_privileges() TO authenticated, service_role;

-- Note: If this was a trigger function, Postgres automatically updates the trigger definition 
-- to point to the new schema.
