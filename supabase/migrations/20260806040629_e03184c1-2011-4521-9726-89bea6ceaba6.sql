-- 1. Garante permissões básicas de esquema
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;

-- 2. Abre tabelas de suporte para leitura universal por usuários autenticados
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_universal_read_v12" ON public.profiles;
CREATE POLICY "profiles_universal_read_v12" ON public.profiles FOR SELECT TO authenticated USING (true);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_roles_universal_read_v12" ON public.user_roles;
CREATE POLICY "user_roles_universal_read_v12" ON public.user_roles FOR SELECT TO authenticated USING (true);

-- 3. Política Definitiva de Visibilidade de Obras
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "books_visibility_policy_v11" ON public.books;

CREATE POLICY "books_visibility_policy_v12" ON public.books
FOR SELECT TO authenticated
USING (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'admin'
  OR 
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

-- 4. Permissões para tabelas de uso individual
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_manage_own_progress" ON public.reading_progress;
CREATE POLICY "users_manage_own_progress" ON public.reading_progress
FOR ALL TO authenticated USING (user_id = auth.uid());

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_manage_own_favorites" ON public.favorites;
CREATE POLICY "users_manage_own_favorites" ON public.favorites
FOR ALL TO authenticated USING (user_id = auth.uid());

ALTER TABLE public.book_access_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "users_insert_own_logs" ON public.book_access_logs;
CREATE POLICY "users_insert_own_logs" ON public.book_access_logs
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "admins_read_all_logs" ON public.book_access_logs;
CREATE POLICY "admins_read_all_logs" ON public.book_access_logs
FOR SELECT TO authenticated USING ((SELECT role FROM public.user_roles WHERE user_id = auth.uid() LIMIT 1) = 'admin');

-- 5. Garante execução de funções de segurança
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_degree() TO authenticated, service_role;
