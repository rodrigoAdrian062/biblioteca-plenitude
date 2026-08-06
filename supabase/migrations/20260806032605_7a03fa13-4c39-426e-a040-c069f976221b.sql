-- Remove a política anterior
DROP POLICY IF EXISTS "Books visibility by degree" ON public.books;

-- Cria a nova política mais robusta
CREATE POLICY "Books visibility by degree" ON public.books
FOR SELECT
TO authenticated
USING (
  -- 1. Administradores veem tudo
  public.has_role(auth.uid(), 'admin')
  OR
  -- 2. Obras sem grau (min_degree = 0) são públicas para todos os autenticados
  books.min_degree = 0
  OR
  -- 3. Membros veem obras até o seu grau atual
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.degree >= books.min_degree
  )
);