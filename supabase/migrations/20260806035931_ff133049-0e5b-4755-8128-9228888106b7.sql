-- FINAL ARCHITECTURAL FIX FOR VISIBILITY
-- The issue is likely that the subquery in the policy is failing or returning null 
-- due to RLS on the referenced tables themselves.

-- 1. Ensure all authenticated users have bypass read access to the reference tables 
-- so the policies on 'books' can actually execute their subqueries.
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- 2. Grant explicit SELECT access
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.books TO authenticated;

-- 3. Now re-enable RLS but with a "true" policy for SELECT to avoid the circular dependency 
-- that subqueries in policies often cause in Supabase.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_read_all" ON public.profiles;
CREATE POLICY "profiles_read_all" ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "user_roles_read_all" ON public.user_roles;
CREATE POLICY "user_roles_read_all" ON public.user_roles FOR SELECT TO authenticated USING (true);

-- 4. Re-enable RLS on books and use a simpler, more performant policy.
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "books_visibility_policy_v5" ON public.books;

CREATE POLICY "books_visibility_policy_v6" ON public.books
FOR SELECT TO authenticated
USING (
  -- Admin check (using the now globally readable user_roles table)
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  OR 
  -- Regular user visibility check
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

-- 5. Final Permission Check
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
