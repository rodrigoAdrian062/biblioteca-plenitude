-- EMERGENCY: FORCE DISABLE RLS ON CRITICAL TABLES TO DEBUG VISIBILITY
-- This will temporarily allow all authenticated users to see all rows.
-- If the books appear after this, the issue is strictly in the RLS logic.

ALTER TABLE public.books DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- Re-grant permissions just in case
GRANT SELECT ON public.books TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;
