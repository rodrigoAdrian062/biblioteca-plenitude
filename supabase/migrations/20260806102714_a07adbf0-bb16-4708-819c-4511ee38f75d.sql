-- RLS v19: NUCLEAR OPTION
-- Para resolver definitivamente, vamos remover a complexidade e usar políticas simples que não podem causar recursão.

-- 1. Desabilitar RLS em tudo para limpar o estado
ALTER TABLE public.books DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- 2. Remover todas as políticas antigas para garantir um novo começo
DROP POLICY IF EXISTS "books_access_v18" ON public.books;
DROP POLICY IF EXISTS "profiles_free_read" ON public.profiles;
DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
DROP POLICY IF EXISTS "user_roles_owner_read" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_admin_read" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_admin_all" ON public.user_roles;
DROP POLICY IF EXISTS "books_visibility_v17" ON public.books;
DROP POLICY IF EXISTS "user_roles_read_policy_v17" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_admin_manage_v17" ON public.user_roles;

-- 3. Criar uma função de ajuda que NUNCA falha e não tem recursão
-- Ela usa apenas auth.uid() e não consulta tabelas se possível, ou faz consulta direta com bypass
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  -- Consulta direta ignorando RLS
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  );
$$;

-- 4. Re-abilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- 5. POLÍTICAS SIMPLES (ZERO RECURSÃO)
-- Profiles: Leitura liberada para autenticados, update apenas o próprio
CREATE POLICY "p1" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "p2" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- User Roles: Usuários veem suas próprias roles, admins veem tudo (usando a função SD)
CREATE POLICY "r1" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "r2" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin());

-- Books: Acesso se for Admin OU (Publicado E Grau Compatível)
CREATE POLICY "b1" ON public.books FOR SELECT TO authenticated
USING (
  public.is_admin()
  OR 
  (
    published = true 
    AND 
    min_degree <= (SELECT degree FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  )
);

-- 6. Garantir permissões básicas (MUITO IMPORTANTE)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.books TO authenticated;
GRANT ALL ON public.books TO service_role;
GRANT ALL ON public.profiles TO service_role;
GRANT ALL ON public.user_roles TO service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
