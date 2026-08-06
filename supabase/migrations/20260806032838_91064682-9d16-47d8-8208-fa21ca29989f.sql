
-- Remove a política anterior
DROP POLICY IF EXISTS "Books visibility by degree" ON public.books;

-- Cria a nova política simplificada: apenas o grau do perfil deve ser maior ou igual ao min_degree do livro
CREATE POLICY "Books visibility by degree" ON public.books
FOR SELECT
TO authenticated
USING (
  -- 1. Administradores veem tudo
  public.has_role(auth.uid(), 'admin')
  OR
  -- 2. Obras sem grau (min_degree = 0) são públicas
  books.min_degree = 0
  OR
  -- 3. Membros veem obras até o seu grau atual
  (SELECT degree FROM public.profiles WHERE id = auth.uid()) >= books.min_degree
);
