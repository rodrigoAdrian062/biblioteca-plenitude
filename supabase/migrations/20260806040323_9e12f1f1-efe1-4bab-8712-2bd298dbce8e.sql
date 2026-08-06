-- COMPLETE RESET OF PERMISSIONS AND POLICIES
-- This migration attempts to fix visibility by granting broad permissions and using extremely simple policies.

-- 1. Grant everything on public schema
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

-- 2. Profiles and User Roles: Disable RLS temporarily to ensure no recursion or filtering during policy execution
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- Re-enable but with 100% open SELECT policies for authenticated users
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_v10" ON public.profiles;
CREATE POLICY "profiles_select_v10" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_all_admin_v10" ON public.profiles FOR ALL TO authenticated USING (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'admin'
);

DROP POLICY IF EXISTS "user_roles_select_v10" ON public.user_roles;
CREATE POLICY "user_roles_select_v10" ON public.user_roles FOR SELECT TO authenticated USING (true);

-- 3. Books: Visibility Policy
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "books_visibility_policy_v7" ON public.books;

CREATE POLICY "books_visibility_policy_v10" ON public.books
FOR SELECT TO authenticated
USING (
  -- 1. Admin bypass: Check user_roles directly without a function to avoid EXECUTE permission issues
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
  OR 
  -- 2. Member check: Degree match and published status
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

-- Ensure service_role bypasses everything
ALTER TABLE public.books FORCE ROW LEVEL SECURITY;
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles FORCE ROW LEVEL SECURITY;

-- 4. Fix potential permission issues on functions used for role checking
CREATE OR REPLACE FUNCTION public.is_admin(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = check_user_id AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
