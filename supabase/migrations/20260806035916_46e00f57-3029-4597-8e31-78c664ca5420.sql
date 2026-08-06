-- SECURITY RESTORATION AND ROBUST VISIBILITY FIX
-- 1. Re-enable RLS (Security is priority)
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 2. Clean up old policies
DROP POLICY IF EXISTS "books_visibility_final" ON public.books;
DROP POLICY IF EXISTS "books_select_policy_v4" ON public.books;
DROP POLICY IF EXISTS "books_select_policy" ON public.books;
DROP POLICY IF EXISTS "profiles_universal_read" ON public.profiles;
DROP POLICY IF EXISTS "user_roles_universal_read" ON public.user_roles;

-- 3. Create high-performance, non-recursive policies
-- Use auth.uid() directly where possible.

-- Profiles: Anyone authenticated can see profiles (needed for degree checks in UI and other policies)
CREATE POLICY "profiles_read_all" ON public.profiles
FOR SELECT TO authenticated
USING (true);

-- User Roles: Anyone authenticated can see roles (needed for admin checks in UI and other policies)
CREATE POLICY "user_roles_read_all" ON public.user_roles
FOR SELECT TO authenticated
USING (true);

-- Books: Robust degree-based visibility
CREATE POLICY "books_visibility_policy_v5" ON public.books
FOR SELECT TO authenticated
USING (
  -- 1. Admins see EVERYTHING (even unpublished)
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
  OR 
  -- 2. Regular users see published books matching their degree
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

-- 4. Ensure storage access (Critical for covers and files)
-- The 'acervo' bucket needs to be readable by authenticated users
-- Note: Bucket policies are managed in the storage schema, but we ensure grants here.
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT ON public.books TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
