DROP POLICY IF EXISTS "Books visibility by degree" ON public.books;

CREATE POLICY "Books visibility by degree" ON public.books
FOR SELECT
TO authenticated
USING (
  -- Se for administrador, vê tudo
  public.has_role(auth.uid(), 'admin')
  OR
  -- Se não for admin, segue a regra de graus:
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND (
      -- Obra sem grau (liberada para todos)
      books.min_degree = 0
      OR
      -- Aprendiz (1) vê apenas grau 1
      (profiles.degree = 1 AND books.min_degree = 1)
      OR
      -- Companheiro (2) vê grau 1 e 2
      (profiles.degree = 2 AND books.min_degree <= 2)
      OR
      -- Mestre (3) vê todos os graus
      (profiles.degree = 3 AND books.min_degree <= 3)
    )
  )
);