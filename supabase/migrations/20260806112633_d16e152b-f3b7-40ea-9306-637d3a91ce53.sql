-- Criar esquema internal se não existir
CREATE SCHEMA IF NOT EXISTS internal;

-- Recriar a função de checagem com SECURITY DEFINER para garantir que ignore RLS
CREATE OR REPLACE FUNCTION internal.check_is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

-- Simplificar as políticas de user_roles para garantir acesso sem recursão
DROP POLICY IF EXISTS user_roles_read_policy ON public.user_roles;
DROP POLICY IF EXISTS user_roles_admin_all ON public.user_roles;
DROP POLICY IF EXISTS user_roles_select ON public.user_roles;
DROP POLICY IF EXISTS user_roles_admin_manage ON public.user_roles;

-- Qualquer usuário autenticado pode ler seus próprios papéis
-- Administradores podem ler tudo via função SECURITY DEFINER
CREATE POLICY user_roles_select ON public.user_roles
FOR SELECT TO authenticated
USING (
  user_id = auth.uid() 
  OR 
  internal.check_is_admin()
);

CREATE POLICY user_roles_admin_manage ON public.user_roles
FOR ALL TO authenticated
USING (internal.check_is_admin())
WITH CHECK (internal.check_is_admin());

-- Garantir GRANTs
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
