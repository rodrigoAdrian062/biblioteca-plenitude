-- Systemic fix for Admin and Visibility
-- Grant full usage to authenticated users so they can query their own roles/profiles
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;

-- Ensure RLS is active
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- Refined User Roles Policy: Admins must be able to see ALL roles to manage them
DROP POLICY IF EXISTS "User roles access policy" ON public.user_roles;
DROP POLICY IF EXISTS "User roles visibility policy v2" ON public.user_roles;
CREATE POLICY "admin_manage_roles" ON public.user_roles
FOR ALL TO authenticated
USING (
  user_id = auth.uid() 
  OR 
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'admin'
);

-- Refined Profiles Policy: Admins must be able to see ALL profiles
DROP POLICY IF EXISTS "Profiles access policy" ON public.profiles;
DROP POLICY IF EXISTS "Profiles visibility policy v2" ON public.profiles;
CREATE POLICY "admin_manage_profiles" ON public.profiles
FOR ALL TO authenticated
USING (
  id = auth.uid() 
  OR 
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'admin'
);

-- Refined Books Policy: Ensure visibility is strictly enforced but works for admins
DROP POLICY IF EXISTS "Books access policy" ON public.books;
DROP POLICY IF EXISTS "Books visibility policy v2" ON public.books;
CREATE POLICY "books_visibility_policy_v3" ON public.books
FOR SELECT TO authenticated
USING (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'admin'
  OR 
  min_degree = 0
  OR
  (SELECT degree FROM public.profiles WHERE id = auth.uid() LIMIT 1) >= min_degree
);

-- Ensure service_role has full power
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
