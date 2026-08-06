-- RLS v17: Move recursion-breaking functions to a private schema and secure them
CREATE SCHEMA IF NOT EXISTS internal;

-- Use CASCADE to handle dependencies when cleaning up old public functions
DROP FUNCTION IF EXISTS public.check_is_admin() CASCADE;

CREATE OR REPLACE FUNCTION internal.check_is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, internal
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  );
$$;

-- Apply new policies using the internal function
CREATE POLICY "user_roles_read_policy_v17" ON public.user_roles FOR SELECT TO authenticated 
USING (auth.uid() = user_id OR internal.check_is_admin());

CREATE POLICY "user_roles_admin_manage_v17" ON public.user_roles FOR ALL TO authenticated 
USING (internal.check_is_admin());

CREATE POLICY "books_visibility_v17" ON public.books FOR SELECT TO authenticated
USING (
  internal.check_is_admin()
  OR 
  (
    published = true 
    AND 
    min_degree <= (SELECT degree FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  )
);

-- Profiles policy (non-recursive)
DROP POLICY IF EXISTS "profiles_read_all_v15" ON public.profiles;
CREATE POLICY "profiles_read_all_v17" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own_v17" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Grants
GRANT USAGE ON SCHEMA internal TO authenticated;
-- The check_is_admin() function is NOT directly executable by users, but used by RLS
REVOKE EXECUTE ON FUNCTION internal.check_is_admin() FROM PUBLIC;
