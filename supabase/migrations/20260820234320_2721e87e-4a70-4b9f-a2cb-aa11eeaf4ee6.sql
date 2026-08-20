DROP FUNCTION IF EXISTS public.get_visiting_stats();

create or replace function public.get_visiting_stats()
returns table (
  user_id uuid,
  full_name text,
  reads_count bigint,
  last_login_at timestamptz,
  last_read_at timestamptz
)
language sql
security definer
set search_path = public, auth
as $$
  select 
    p.id as user_id,
    p.full_name,
    count(l.id) as reads_count,
    u.last_sign_in_at as last_login_at,
    max(l.created_at) as last_read_at
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.book_access_logs l on l.user_id = p.id
  group by p.id, p.full_name, u.last_sign_in_at
  order by last_read_at desc nulls last, reads_count desc;
$$;

revoke execute on function public.get_visiting_stats() from public;
revoke execute on function public.get_visiting_stats() from authenticated;
revoke execute on function public.get_visiting_stats() from anon;
grant execute on function public.get_visiting_stats() to service_role;