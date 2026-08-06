-- RLS v14: Resolving infinite recursion in user_roles and profiles
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "user_roles_select_policy" ON public.user_roles;
DROP POLICY IF EXISTS "books_visibility_policy" ON public.books;
DROP POLICY IF EXISTS "books_visibility_final" ON public.books;
DROP POLICY IF EXISTS "books_visibility_policy_v13" ON public.books;
DROP POLICY IF EXISTS "profiles_read_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "user_roles_read_all" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_admin_manage" ON public.user_roles;
DROP POLICY IF EXISTS "books_visibility_v14" ON public.books;

-- Profiles: Allow users to see all profiles (needed for degree checks) and update their own
CREATE POLICY "profiles_read_all" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- User Roles: Allow users to see roles to check admin status without recursion
CREATE POLICY "user_roles_read_all" ON public.user_roles FOR SELECT TO authenticated USING (true);
-- Admin management (still allowed for those who already have the role)
CREATE POLICY "user_roles_admin_manage" ON public.user_roles FOR ALL TO authenticated 
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Books: Final visibility policy using direct lookups
CREATE POLICY "books_visibility_v14" ON public.books FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  OR 
  (
    published = true 
    AND 
    min_degree <= (SELECT degree FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  )
);

GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.books TO authenticated;
GRANT ALL ON public.books TO service_role;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.user_roles TO service_role;