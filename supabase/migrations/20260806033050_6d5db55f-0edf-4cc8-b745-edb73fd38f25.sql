
-- Garante que o usuário autenticado pode ler seus próprios dados de perfil
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = id);

-- Garante que a política de livros permita a leitura se o grau for compatível
DROP POLICY IF EXISTS "Books visibility by degree" ON public.books;
CREATE POLICY "Books visibility by degree" ON public.books
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR
  min_degree = 0
  OR
  (SELECT degree FROM public.profiles WHERE id = auth.uid()) >= books.min_degree
);

-- Concede privilégios explicitamente para evitar erros de permissão
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.books TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
