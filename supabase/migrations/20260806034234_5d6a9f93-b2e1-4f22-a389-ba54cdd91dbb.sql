-- 1. Garantir que as tabelas essenciais existem e têm RLS
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.global_settings ENABLE ROW LEVEL SECURITY;

-- 2. Conceder permissões de uso no schema public para os papéis da API
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 3. Conceder permissões SELECT para usuários autenticados
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.books TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.global_settings TO authenticated;

-- 4. Garantir que a função has_role seja acessível
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- 5. Restaurar política de visibilidade de livros (A mais crítica)
DROP POLICY IF EXISTS "Books visibility by degree" ON public.books;
CREATE POLICY "Books visibility by degree" ON public.books
FOR SELECT
TO authenticated
USING (
  -- Admin vê tudo
  (SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ))
  OR
  -- Obras publicadas compatíveis com o grau
  (published = true AND (
    min_degree = 0
    OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.degree >= books.min_degree
      AND profiles.active = true
    )
  ))
);

-- 6. Restaurar políticas de perfis
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT TO authenticated
USING (
  auth.uid() = id 
  OR 
  (SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ))
);

-- 7. Restaurar políticas de user_roles
DROP POLICY IF EXISTS "read own roles" ON public.user_roles;
CREATE POLICY "read own roles" ON public.user_roles 
FOR SELECT TO authenticated
USING (
  user_id = auth.uid() 
  OR 
  (SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ))
);

-- 8. Garantir que o service_role tenha acesso total (bypass RLS)
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
