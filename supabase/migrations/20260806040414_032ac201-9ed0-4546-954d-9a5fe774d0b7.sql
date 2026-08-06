-- RE-FIX FOR ADMIN AND VISIBILITY (NO FUNCTION DROPS)
-- Instead of dropping functions that have dependencies, we will just update their role access
-- and ensure the policies are using the most direct and reliable checks.

-- 1. Restore broad permissions to ensure no underlying table access issues
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;

-- 2. Profiles and User Roles: Open SELECT for authenticated
-- This is critical so subqueries in other policies can work.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_v11" ON public.profiles;
CREATE POLICY "profiles_select_v11" ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "user_roles_select_v11" ON public.user_roles;
CREATE POLICY "user_roles_select_v11" ON public.user_roles FOR SELECT TO authenticated USING (true);

-- 3. Books Visibility Policy
-- We use a simple, robust check that bypasses for admins.
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "books_visibility_policy_v10" ON public.books;

CREATE POLICY "books_visibility_policy_v11" ON public.books
FOR SELECT TO authenticated
USING (
  -- Admin bypass
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'admin'
  OR 
  -- Member check
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

-- 4. Address the linter warnings by securing the existing functions without dropping them
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin') THEN
        REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM PUBLIC, anon;
        GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;
    END IF;
END $$;
