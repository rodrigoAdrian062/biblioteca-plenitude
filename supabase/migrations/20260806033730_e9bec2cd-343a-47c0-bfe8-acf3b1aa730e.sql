-- Revogar e reconceder permissões para garantir que authenticated possa ler
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.books TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;

-- Garantir que a função has_role seja acessível para authenticated, pois o RLS a utiliza
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Recriar política de visibilidade de livros com lógica simplificada para evitar falhas silenciosas
DROP POLICY IF EXISTS "Books visibility by degree" ON public.books;
CREATE POLICY "Books visibility by degree" ON public.books
FOR SELECT
TO authenticated
USING (
  -- Se for admin, vê tudo
  (SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ))
  OR
  -- Obras públicas ou compatíveis com o grau do irmão
  (published = true AND (
    min_degree = 0
    OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.degree >= books.min_degree
    )
  ))
);

-- Garantir que o usuário pode ler seu próprio perfil (essencial para a política acima)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = id OR (SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
)));