
-- Revoga execução pública e autenticada direta da função para evitar chamadas maliciosas
revoke execute on function public.get_visiting_stats() from public;
revoke execute on function public.get_visiting_stats() from authenticated;
revoke execute on function public.get_visiting_stats() from anon;

-- Garante que apenas o service_role possa executar a função
-- O backend (TanStack Start server functions) usa o service_role via supabaseAdmin
grant execute on function public.get_visiting_stats() to service_role;
