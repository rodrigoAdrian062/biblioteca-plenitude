-- Remover políticas atuais que causam recursão
DROP POLICY IF EXISTS user_roles_read_policy ON public.user_roles;
DROP POLICY IF EXISTS user_roles_admin_all ON public.user_roles;

-- Nova política de leitura: usuários veem seus próprios papéis, 
-- e administradores veem todos os papéis (usando uma subquery direta para evitar a função recursiva)
CREATE POLICY user_roles_read_policy ON public.user_roles
FOR SELECT TO authenticated
USING (
  user_id = auth.uid() 
  OR 
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Nova política de gerenciamento total para administradores
CREATE POLICY user_roles_admin_all ON public.user_roles
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Garantir que a função internal.check_is_admin continue funcionando e seja usada em OUTRAS tabelas
-- mas agora ela não deve mais causar loop pois o SELECT acima é uma subquery direta na política.
