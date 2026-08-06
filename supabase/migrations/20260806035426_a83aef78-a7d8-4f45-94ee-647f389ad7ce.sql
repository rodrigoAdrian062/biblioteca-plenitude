-- FINAL COMPREHENSIVE FIX: Permissions and RLS
-- 1. Grant base schema usage
GRANT USAGE ON SCHEMA public TO authenticated, anon;

-- 2. Grant explicit SELECT on all user-facing tables
GRANT SELECT ON public.profiles TO authenticated, anon;
GRANT SELECT ON public.user_roles TO authenticated, anon;
GRANT SELECT ON public.books TO authenticated, anon;
GRANT SELECT ON public.global_settings TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reading_progress TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT SELECT, INSERT ON public.book_access_logs TO authenticated;

-- 3. Restore/Update Policies to be robust and non-recursive
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- Profiles: Users see themselves, Admins see everyone
DROP POLICY IF EXISTS "admin_manage_profiles" ON public.profiles;
CREATE POLICY "profiles_select_policy" ON public.profiles
FOR SELECT TO authenticated
USING (
  id = auth.uid() 
  OR 
  (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
);

-- User Roles: Users see their own, Admins see all
DROP POLICY IF EXISTS "admin_manage_roles" ON public.user_roles;
CREATE POLICY "user_roles_select_policy" ON public.user_roles
FOR SELECT TO authenticated
USING (
  user_id = auth.uid() 
  OR 
  (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
);

-- Books: Degree check + Admin bypass
DROP POLICY IF EXISTS "books_visibility_policy_v3" ON public.books;
CREATE POLICY "books_select_policy" ON public.books
FOR SELECT TO authenticated
USING (
  (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  OR 
  min_degree = 0
  OR
  ((SELECT degree FROM public.profiles WHERE id = auth.uid() LIMIT 1) >= min_degree)
);

-- 4. Global Settings: Everyone authenticated can read
DROP POLICY IF EXISTS "Global settings access policy" ON public.global_settings;
CREATE POLICY "global_settings_select_policy" ON public.global_settings
FOR SELECT TO authenticated
USING (true);

-- 5. Ensure service_role is truly unrestricted
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;
