-- EMERGENCY FIX: Ensuring book visibility
-- Grant broad SELECT access to avoid permission issues during the degree check.

GRANT SELECT ON public.books TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;

-- Re-create the book visibility policy to be as simple as possible.
DROP POLICY IF EXISTS "books_select_policy_v4" ON public.books;

CREATE POLICY "books_visibility_final" ON public.books
FOR SELECT TO authenticated
USING (
  -- 1. Admins see EVERYTHING
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
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

-- Ensure profiles are readable for the degree comparison
DROP POLICY IF EXISTS "profiles_select_policy_v3" ON public.profiles;
CREATE POLICY "profiles_universal_read" ON public.profiles
FOR SELECT TO authenticated
USING (true);

-- Ensure user_roles are readable for the admin check
DROP POLICY IF EXISTS "user_roles_select_policy_v3" ON public.user_roles;
CREATE POLICY "user_roles_universal_read" ON public.user_roles
FOR SELECT TO authenticated
USING (true);
