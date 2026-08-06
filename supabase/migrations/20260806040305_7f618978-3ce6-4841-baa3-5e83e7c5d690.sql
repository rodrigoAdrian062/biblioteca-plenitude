-- RE-FIX FOR ROLES AND VISIBILITY
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_universal_read" ON public.profiles;
CREATE POLICY "profiles_universal_read" ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "user_roles_universal_read" ON public.user_roles;
CREATE POLICY "user_roles_universal_read" ON public.user_roles FOR SELECT TO authenticated USING (true);

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "books_visibility_policy_v6" ON public.books;

CREATE POLICY "books_visibility_policy_v7" ON public.books
FOR SELECT TO authenticated
USING (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'admin'
  OR 
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

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
