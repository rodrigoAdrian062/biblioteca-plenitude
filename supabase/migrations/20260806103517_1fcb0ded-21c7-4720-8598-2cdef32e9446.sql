-- RLS v23: IDEMPOTENT RECURSION FIX
-- Cleans up all possible existing policy names to ensure a clean migration path.

-- 1. Disable RLS to safely clear policies
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.books DISABLE ROW LEVEL SECURITY;

-- 2. Comprehensive cleanup
DO $$ 
BEGIN
    -- Profiles
    DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
    DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
    DROP POLICY IF EXISTS "profiles_read_v21" ON public.profiles;
    DROP POLICY IF EXISTS "profiles_update_v21" ON public.profiles;
    DROP POLICY IF EXISTS "profiles_read_all_v17" ON public.profiles;
    DROP POLICY IF EXISTS "profiles_update_own_v17" ON public.profiles;
    DROP POLICY IF EXISTS "profiles_free_read" ON public.profiles;
    DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
    
    -- User Roles
    DROP POLICY IF EXISTS "user_roles_select" ON public.user_roles;
    DROP POLICY IF EXISTS "user_roles_admin_all" ON public.user_roles;
    DROP POLICY IF EXISTS "user_roles_read_v21" ON public.user_roles;
    DROP POLICY IF EXISTS "user_roles_admin_v21" ON public.user_roles;
    DROP POLICY IF EXISTS "user_roles_owner_read" ON public.user_roles;
    DROP POLICY IF EXISTS "user_roles_admin_read" ON public.user_roles;
    DROP POLICY IF EXISTS "user_roles_read_policy_v17" ON public.user_roles;
    DROP POLICY IF EXISTS "user_roles_admin_manage_v17" ON public.user_roles;
    
    -- Books
    DROP POLICY IF EXISTS "books_select_policy" ON public.books;
    DROP POLICY IF EXISTS "books_admin_all" ON public.books;
    DROP POLICY IF EXISTS "books_read_v21" ON public.books;
    DROP POLICY IF EXISTS "books_visibility_v17" ON public.books;
    DROP POLICY IF EXISTS "books_access_v18" ON public.books;
END $$;

-- 3. Security Definer Helper (Bypasses RLS)
CREATE SCHEMA IF NOT EXISTS internal;
CREATE OR REPLACE FUNCTION internal.check_is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, internal, pg_temp
AS $$
DECLARE
    is_adm boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() 
        AND role = 'admin'
    ) INTO is_adm;
    RETURN is_adm;
END;
$$;

-- 4. Re-enable RLS with Optimized, Non-Recursive Policies

-- Profiles: Authenticated users can read ALL profiles to avoid subquery recursion in other policies.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_v23" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_v23" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- User Roles: Owner can see their own row, Admins see everything via bypass function.
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_select_v23" ON public.user_roles FOR SELECT TO authenticated 
USING (auth.uid() = user_id OR internal.check_is_admin());
CREATE POLICY "user_roles_admin_v23" ON public.user_roles FOR ALL TO authenticated 
USING (internal.check_is_admin());

-- Books: Degree check is now safe because 'profiles' is readable without recursion.
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "books_select_v23" ON public.books FOR SELECT TO authenticated
USING (
    internal.check_is_admin()
    OR 
    (
        published = true 
        AND 
        min_degree <= (SELECT p.degree FROM public.profiles p WHERE p.id = auth.uid())
    )
);
CREATE POLICY "books_admin_v23" ON public.books FOR ALL TO authenticated 
USING (internal.check_is_admin());

-- 5. Permissions
GRANT USAGE ON SCHEMA internal TO authenticated;
GRANT USAGE ON SCHEMA internal TO service_role;
GRANT EXECUTE ON FUNCTION internal.check_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION internal.check_is_admin() TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
