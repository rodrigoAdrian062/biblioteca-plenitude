-- Revogar execução pública de funções críticas e restringir a papéis autenticados
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;

REVOKE EXECUTE ON FUNCTION public.current_degree() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_degree() TO service_role;

-- A política de livros já foi atualizada para usar uma subquery direta em vez de current_degree() 
-- no passo anterior para evitar problemas de recursão/permissão no RLS.
