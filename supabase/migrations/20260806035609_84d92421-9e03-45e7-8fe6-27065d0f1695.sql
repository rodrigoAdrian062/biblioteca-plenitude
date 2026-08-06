-- Otimização final para garantir que TODAS as obras cadastradas apareçam
-- Remove filtros de 'active' ou 'published' se existirem e estiverem bloqueando o admin
-- E garante que as permissões SELECT sejam amplas o suficiente.

GRANT SELECT ON public.books TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;

-- Simplificando a política para evitar falhas em subconsultas complexas
DROP POLICY IF EXISTS "books_select_policy" ON public.books;

CREATE POLICY "books_select_policy_v4" ON public.books
FOR SELECT TO authenticated
USING (
  -- Se for admin, vê TUDO (mesmo o que não está publicado)
  (auth.jwt() ->> 'role' = 'service_role') 
  OR 
  (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'))
  OR
  (
    -- Usuários comuns veem o que está publicado E é compatível com o grau
    published = true 
    AND 
    (
      min_degree = 0 
      OR 
      (SELECT degree FROM public.profiles WHERE id = auth.uid() LIMIT 1) >= min_degree
    )
  )
);

-- Garantir que a tabela profiles pode ser lida por qualquer um autenticado para o check de grau
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy_v3" ON public.profiles
FOR SELECT TO authenticated
USING (true);

-- Garantir que a tabela user_roles pode ser lida para o check de admin
DROP POLICY IF EXISTS "user_roles_select_policy" ON public.user_roles;
CREATE POLICY "user_roles_select_policy_v3" ON public.user_roles
FOR SELECT TO authenticated
USING (true);
