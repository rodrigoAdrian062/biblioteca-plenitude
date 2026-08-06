-- RLS v21: LIMPEZA TOTAL E CORREÇÃO FINAL
CREATE SCHEMA IF NOT EXISTS internal;

-- Remover a função antiga com CASCADE para limpar as políticas dependentes
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;

-- Criar a nova função no esquema privado com segurança total
CREATE OR REPLACE FUNCTION internal.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, internal
STABLE
AS $$
  -- Consulta direta ignorando RLS
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  );
$$;

-- Recriar as políticas usando a nova função segura
-- User Roles
CREATE POLICY "user_roles_read_v21" ON public.user_roles FOR SELECT TO authenticated 
USING (auth.uid() = user_id OR internal.is_admin());

CREATE POLICY "user_roles_admin_v21" ON public.user_roles FOR ALL TO authenticated 
USING (internal.is_admin());

-- Books
CREATE POLICY "books_read_v21" ON public.books FOR SELECT TO authenticated
USING (
  internal.is_admin()
  OR 
  (
    published = true 
    AND 
    min_degree <= (SELECT degree FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  )
);

-- Profiles (Garantir que p1 e p2 ainda existam ou recriá-las)
DROP POLICY IF EXISTS "p1" ON public.profiles;
DROP POLICY IF EXISTS "p2" ON public.profiles;
CREATE POLICY "profiles_read_v21" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_v21" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Permissões
GRANT USAGE ON SCHEMA internal TO authenticated;
GRANT USAGE ON SCHEMA internal TO service_role;
REVOKE EXECUTE ON FUNCTION internal.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION internal.is_admin() FROM authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
