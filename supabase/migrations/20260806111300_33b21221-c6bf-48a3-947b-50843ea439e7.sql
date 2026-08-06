-- Removendo políticas de perfis que dependem de user_roles para evitar recursão cruzada
DROP POLICY IF EXISTS profiles_update_policy ON public.profiles;
DROP POLICY IF EXISTS profiles_admin_manage ON public.profiles;

-- Política de atualização usando a função SECURITY DEFINER que não tem RLS
CREATE POLICY profiles_update_policy ON public.profiles
FOR UPDATE TO authenticated
USING (
  id = auth.uid() 
  OR 
  internal.check_is_admin()
)
WITH CHECK (
  id = auth.uid() 
  OR 
  internal.check_is_admin()
);

-- Política de gerenciamento total para administradores usando a função segura
CREATE POLICY profiles_admin_manage ON public.profiles
FOR ALL TO authenticated
USING (
  internal.check_is_admin()
)
WITH CHECK (
  internal.check_is_admin()
);
