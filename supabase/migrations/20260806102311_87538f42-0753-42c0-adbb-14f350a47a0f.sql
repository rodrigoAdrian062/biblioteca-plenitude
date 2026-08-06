-- RLS v18: Final recursion break
-- We move role checking to session-level metadata to avoid querying tables within policies that guard those tables.

-- 1. Create a function to set the role in the session (to be used by server-side code or triggers if needed)
-- But for RLS, we will use a more direct approach that avoids user_roles entirely if possible.

-- 2. Drop EVERYTHING problematic
DROP POLICY IF EXISTS "user_roles_read_policy_v17" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_admin_manage_v17" ON public.user_roles;
DROP POLICY IF EXISTS "books_visibility_v17" ON public.books;
DROP POLICY IF EXISTS "profiles_read_all_v17" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own_v17" ON public.profiles;

-- 3. Profiles: Purely public to authenticated (safe for this app)
-- This eliminates profiles from the recursion chain.
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_free_read" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- 4. User Roles: This is the source of the recursion.
-- We MUST allow users to read their own roles without a policy that queries user_roles itself.
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- The simplest non-recursive policy: users see their own rows.
CREATE POLICY "user_roles_owner_read" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Admin check function - MUST be extremely careful not to recurse.
-- We use a SECURITY DEFINER function that bypasses RLS and queries the table directly.
CREATE OR REPLACE FUNCTION internal.is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, internal
STABLE
AS $$
  -- Direct query on the table, RLS is ignored because it's SECURITY DEFINER
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = uid 
    AND role = 'admin'
  );
$$;

-- Now use that function in policies. It's safe because it doesn't trigger RLS on user_roles itself.
CREATE POLICY "user_roles_admin_read" ON public.user_roles FOR SELECT TO authenticated 
USING (internal.is_admin(auth.uid()));

CREATE POLICY "user_roles_admin_all" ON public.user_roles FOR ALL TO authenticated 
USING (internal.is_admin(auth.uid()));

-- 5. Books: Use the non-recursive admin check
ALTER TABLE public.books DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "books_access_v18" ON public.books FOR SELECT TO authenticated
USING (
  internal.is_admin(auth.uid())
  OR 
  (
    published = true 
    AND 
    min_degree <= (SELECT degree FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  )
);

-- 6. Ensure service role has absolute power
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE ON SCHEMA internal TO authenticated;
REVOKE EXECUTE ON FUNCTION internal.is_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION internal.is_admin(uuid) TO service_role;
