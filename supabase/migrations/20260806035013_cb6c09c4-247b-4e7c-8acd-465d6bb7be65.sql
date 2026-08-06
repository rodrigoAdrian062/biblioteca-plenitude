-- Permissive grants to ensure the Data API can access tables
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Re-verify RLS is enabled but policies are correct
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Books access policy" ON public.books;
DROP POLICY IF EXISTS "Books visibility by degree" ON public.books;

-- A more direct policy that avoids complex subqueries if possible for debugging
CREATE POLICY "Books visibility policy v2" ON public.books
FOR SELECT TO authenticated
USING (
  -- 1. Admins see everything
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'admin'
  OR 
  -- 2. Members see books matching their degree or public books (degree 0)
  (
    min_degree = 0 
    OR 
    (SELECT degree FROM public.profiles WHERE id = auth.uid() LIMIT 1) >= min_degree
  )
);

-- Ensure profiles and roles are also selectable for the subqueries in policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Profiles access policy" ON public.profiles;
CREATE POLICY "Profiles visibility policy v2" ON public.profiles
FOR SELECT TO authenticated
USING (id = auth.uid() OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'admin');

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "User roles access policy" ON public.user_roles;
CREATE POLICY "User roles visibility policy v2" ON public.user_roles
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'admin');
