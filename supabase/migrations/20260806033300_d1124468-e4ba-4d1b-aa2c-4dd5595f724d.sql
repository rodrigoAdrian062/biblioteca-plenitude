-- Ajusta as permissões e garante que as tabelas necessárias existam
CREATE TABLE IF NOT EXISTS public.global_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.global_settings TO authenticated;
GRANT ALL ON public.global_settings TO service_role;

-- Recria a função de grau atual para ser mais resiliente
CREATE OR REPLACE FUNCTION public.current_degree()
RETURNS smallint LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT degree FROM public.profiles WHERE id = auth.uid() AND active LIMIT 1), 0)::smallint
$$;

-- Simplifica a política de visibilidade para evitar subqueries complexas que podem falhar no RLS
DROP POLICY IF EXISTS "Books visibility by degree" ON public.books;
CREATE POLICY "Books visibility by degree" ON public.books
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR
  (published = true AND (
    min_degree = 0
    OR
    min_degree <= (SELECT degree FROM public.profiles WHERE id = auth.uid() AND active LIMIT 1)
  ))
);

-- Garante que o usuário pode ler seu próprio perfil (crítico para visibilidade)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin'));

-- Garante leitura de papéis
DROP POLICY IF EXISTS "read own roles" ON public.user_roles;
CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- Concessões finais
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.books TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.global_settings TO authenticated;
