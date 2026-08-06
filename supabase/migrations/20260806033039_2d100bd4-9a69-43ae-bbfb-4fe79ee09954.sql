
-- Garante que o usuário autenticado pode ler seus próprios dados de perfil (essencial para a política de livros)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = id);

-- Garante que o administrador pode ver todos os perfis
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Garante que a política de livros use uma subquery estável e performática
DROP POLICY IF EXISTS "Books visibility by degree" ON public.books;
CREATE POLICY "Books visibility by degree" ON public.books
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR
  min_degree = 0
  OR
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.degree >= books.min_degree
  )
);

-- Concede privilégios explicitamente para evitar erros de permissão em tabelas relacionadas
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.books TO authenticated;
GRANT INSERT, SELECT, DELETE ON public.reading_progress TO authenticated;
GRANT INSERT, SELECT, DELETE ON public.favorites TO authenticated;
GRANT INSERT, SELECT ON public.book_access_logs TO authenticated;
