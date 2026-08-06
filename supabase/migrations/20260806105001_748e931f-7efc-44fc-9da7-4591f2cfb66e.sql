-- 1. Limpar as políticas problemáticas e redundantes
DROP POLICY IF EXISTS "read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_admin_v23" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_v10" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_v11" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_v23" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_universal_read" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_universal_read_v12" ON public.user_roles;

DROP POLICY IF EXISTS "admin manage profiles" ON public.profiles;
DROP POLICY IF EXISTS "own profile read" ON public.profiles;
DROP POLICY IF EXISTS "own profile update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_all_admin_v10" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_v10" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_v11" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_v23" ON public.profiles;
DROP POLICY IF EXISTS "profiles_universal_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_universal_read_v12" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own_v15" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_v23" ON public.profiles;

DROP POLICY IF EXISTS "admin manage books" ON public.books;
DROP POLICY IF EXISTS "books_admin_v23" ON public.books;
DROP POLICY IF EXISTS "books_select_v23" ON public.books;
DROP POLICY IF EXISTS "members read by degree" ON public.books;

-- 2. Corrigir a função de verificação de admin para evitar recursão
CREATE OR REPLACE FUNCTION internal.check_is_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'internal', 'pg_temp'
AS $function$
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
$function$;

-- 3. Aplicar novas políticas para USER_ROLES
CREATE POLICY "user_roles_read_policy" ON public.user_roles
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR internal.check_is_admin());

CREATE POLICY "user_roles_admin_all" ON public.user_roles
FOR ALL TO authenticated
USING (internal.check_is_admin())
WITH CHECK (internal.check_is_admin());

-- 4. Aplicar novas políticas para PROFILES
CREATE POLICY "profiles_read_all" ON public.profiles
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "profiles_update_policy" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id OR internal.check_is_admin())
WITH CHECK (auth.uid() = id OR internal.check_is_admin());

CREATE POLICY "profiles_admin_manage" ON public.profiles
FOR ALL TO authenticated
USING (internal.check_is_admin())
WITH CHECK (internal.check_is_admin());

-- 5. Aplicar novas políticas para BOOKS
CREATE POLICY "books_access_policy" ON public.books
FOR SELECT TO authenticated
USING (
    internal.check_is_admin() 
    OR (
        published = true 
        AND min_degree <= (SELECT degree FROM public.profiles WHERE id = auth.uid())
    )
);

CREATE POLICY "books_admin_manage" ON public.books
FOR ALL TO authenticated
USING (internal.check_is_admin())
WITH CHECK (internal.check_is_admin());
