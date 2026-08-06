-- Garantir que as tabelas tenham RLS habilitado (caso não estejam)
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Conceder permissões de uso no schema public
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Conceder permissões de leitura nas tabelas fundamentais
GRANT SELECT ON public.books TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;

-- Garantir que a função has_role seja executável por usuários autenticados (usada no RLS)
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Recriar política de visibilidade de livros com lógica simplificada e robusta
DROP POLICY IF EXISTS "Books visibility by degree" ON public.books;
CREATE POLICY "Books visibility by degree" ON public.books
FOR SELECT
TO authenticated
USING (
  -- 1. Administradores veem tudo
  (SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  ))
  OR
  -- 2. Obras publicadas que respeitam o grau do irmão
  (published = true AND (
    min_degree = 0 -- Obras sem grau (públicas para a loja)
    OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND degree >= books.min_degree
      AND active = true
    )
  ))
);

-- Garantir que o usuário pode ler seu próprio perfil e admins podem ler todos
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

-- Garantir que usuários podem ver seus próprios papéis
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