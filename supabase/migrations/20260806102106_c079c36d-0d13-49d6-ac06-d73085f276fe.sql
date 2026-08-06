-- RLS v15: Completely eliminate recursion by moving role checks to a SECURITY DEFINER function
-- This avoids the policy for user_roles querying user_roles itself.

-- 1. Create a helper function in a private schema or as security definer to bypass RLS
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  );
$$;

-- 2. Drop all previous potentially recursive policies
DROP POLICY IF EXISTS "profiles_read_all" ON public.profiles;
DROP POLICY IF EXISTS "user_roles_read_all" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_admin_manage" ON public.user_roles;
DROP POLICY IF EXISTS "books_visibility_v14" ON public.books;

-- 3. Profiles policy: authenticated users can read all, update own
CREATE POLICY "profiles_read_all_v15" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own_v15" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 4. User Roles policy: use the security definer function to avoid recursion
-- Users can see their own roles, admins can see all
CREATE POLICY "user_roles_read_policy_v15" ON public.user_roles FOR SELECT TO authenticated 
USING (auth.uid() = user_id OR public.check_is_admin());

CREATE POLICY "user_roles_admin_manage_v15" ON public.user_roles FOR ALL TO authenticated 
USING (public.check_is_admin());

-- 5. Books policy: use the helper functions for non-recursive checks
CREATE POLICY "books_visibility_v15" ON public.books FOR SELECT TO authenticated
USING (
  public.check_is_admin()
  OR 
  (
    published = true 
    AND 
    min_degree <= (SELECT degree FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  )
);

-- 6. Ensure permissions are correct
GRANT EXECUTE ON FUNCTION public.check_is_admin() TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.books TO authenticated;
GRANT ALL ON public.books TO service_role;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.user_roles TO service_role;