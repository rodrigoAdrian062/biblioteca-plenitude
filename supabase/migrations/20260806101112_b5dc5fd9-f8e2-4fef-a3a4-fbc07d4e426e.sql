-- 1. Garante permissões básicas de uso do esquema e tabelas
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- 2. Reseta permissões das tabelas principais
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.books TO authenticated;
GRANT SELECT ON public.books TO anon;

-- 3. Reseta permissões para tabelas de funcionalidades do usuário
GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reading_progress TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.book_access_logs TO authenticated;
GRANT SELECT ON public.global_settings TO authenticated;

-- 4. Garante acesso total ao service_role para operações administrativas
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- 5. Configura RLS de forma simplificada e robusta para evitar recursão
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_read_all" ON public.profiles;
CREATE POLICY "profiles_read_all" ON public.profiles FOR SELECT TO authenticated USING (true);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_roles_read_all" ON public.user_roles;
CREATE POLICY "user_roles_read_all" ON public.user_roles FOR SELECT TO authenticated USING (true);

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "books_visibility_policy_v13" ON public.books;
DROP POLICY IF EXISTS "books_visibility_policy_v12" ON public.books;
DROP POLICY IF EXISTS "books_visibility_policy_v6" ON public.books;
DROP POLICY IF EXISTS "books_select_policy" ON public.books;

-- Nova política de visibilidade (v13)
CREATE POLICY "books_visibility_policy_v13" ON public.books
FOR SELECT TO authenticated
USING (
  -- Administradores veem TUDO
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  OR 
  -- Usuários comuns veem obras publicadas compatíveis com seu grau
  (
    published = true 
    AND 
    (
      min_degree = 0 
      OR 
      (SELECT degree FROM public.profiles WHERE id = auth.uid() LIMIT 1) >= min_degree
    )
  )
);

-- 6. Política para configurações globais
ALTER TABLE public.global_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can manage global settings" ON public.global_settings;
CREATE POLICY "Admins can manage global settings"
ON public.global_settings
FOR ALL
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Authenticated can read global settings" ON public.global_settings;
CREATE POLICY "Authenticated can read global settings"
ON public.global_settings
FOR SELECT
TO authenticated
USING (true);
