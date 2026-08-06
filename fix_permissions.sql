-- Grant USAGE on public schema to all authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Ensure tables have RLS enabled
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;

-- Grant SELECT on critical tables
GRANT SELECT ON public.books TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.global_settings TO authenticated;

-- Drop existing visibility policies to recreate them cleanly
DROP POLICY IF EXISTS "Books visibility by degree" ON public.books;
DROP POLICY IF EXISTS "Admins see all books" ON public.books;
DROP POLICY IF EXISTS "Public degree 0 books" ON public.books;
DROP POLICY IF EXISTS "Books access policy" ON public.books;

-- Single comprehensive policy for books
CREATE POLICY "Books access policy" ON public.books
FOR SELECT TO authenticated
USING (
  -- Admin bypass
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  OR 
  (
    -- Degree check: user degree >= book min_degree
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND degree >= books.min_degree)
    OR
    -- Degree 0 is public
    min_degree = 0
  )
);

-- Profiles visibility
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Profiles access policy" ON public.profiles;
CREATE POLICY "Profiles access policy" ON public.profiles
FOR SELECT TO authenticated
USING (
  id = auth.uid() 
  OR 
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- User roles visibility
DROP POLICY IF EXISTS "Users can view their own role" ON public.user_roles;
DROP POLICY IF EXISTS "User roles access policy" ON public.user_roles;
CREATE POLICY "User roles access policy" ON public.user_roles
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR 
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Global settings visibility
DROP POLICY IF EXISTS "Everyone can view settings" ON public.global_settings;
DROP POLICY IF EXISTS "Global settings access policy" ON public.global_settings;
CREATE POLICY "Global settings access policy" ON public.global_settings
FOR SELECT TO authenticated
USING (true);

-- Ensure service_role has all grants
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
