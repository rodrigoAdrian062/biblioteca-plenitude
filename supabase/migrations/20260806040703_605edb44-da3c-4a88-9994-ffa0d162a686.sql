-- 1. Create a private schema for security functions
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

-- 2. Move has_role to private schema and secure it
ALTER FUNCTION public.has_role(uuid, public.app_role) SET SCHEMA private;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 3. Move is_admin to private schema and secure it
-- Check if it exists first as it might have been created with different params or not at all
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin' AND pronamespace = 'public'::regnamespace) THEN
        ALTER FUNCTION public.is_admin(uuid) SET SCHEMA private;
        REVOKE ALL ON FUNCTION private.is_admin(uuid) FROM PUBLIC, anon, authenticated;
        GRANT EXECUTE ON FUNCTION private.is_admin(uuid) TO authenticated, service_role;
    END IF;
END $$;

-- 4. Move current_degree to private schema and secure it
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'current_degree' AND pronamespace = 'public'::regnamespace) THEN
        ALTER FUNCTION public.current_degree() SET SCHEMA private;
        REVOKE ALL ON FUNCTION private.current_degree() FROM PUBLIC, anon, authenticated;
        GRANT EXECUTE ON FUNCTION private.current_degree() TO authenticated, service_role;
    END IF;
END $$;

-- 5. Update RLS policies to use the new schema path
-- Profiles
DROP POLICY IF EXISTS "profiles_universal_read_v12" ON public.profiles;
CREATE POLICY "profiles_universal_read_v12" ON public.profiles FOR SELECT TO authenticated USING (true);

-- Books (Visibility)
DROP POLICY IF EXISTS "books_visibility_policy_v12" ON public.books;
CREATE POLICY "books_visibility_policy_v12" ON public.books
FOR SELECT TO authenticated
USING (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'admin'
  OR 
  (
    published = true 
    AND 
    (
      min_degree = 0 
      OR 
      (SELECT degree FROM public.profiles WHERE id = auth.uid() LIMIT 1) >= min_degree
    )
  )
);

-- Global Settings
DROP POLICY IF EXISTS "Admins can manage global settings" ON public.global_settings;
CREATE POLICY "Admins can manage global settings"
ON public.global_settings
FOR ALL
TO authenticated
USING (private.has_role(auth.uid(), 'admin'));

-- 6. Update has_role usage in user_roles policy if it exists
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
-- We don't want a recursive policy here, usually user_roles is managed by admin functions via service_role or restricted policies
