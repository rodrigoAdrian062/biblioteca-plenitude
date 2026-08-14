
create or replace function public.get_visiting_stats()
returns table (
  user_id uuid,
  full_name text,
  reads_count bigint
)
language sql
security definer
set search_path = public
as $$
  select 
    p.id as user_id,
    p.full_name,
    count(l.id) as reads_count
  from public.profiles p
  left join public.book_access_logs l on l.user_id = p.id
  group by p.id, p.full_name
  order by reads_count desc;
$$;

grant execute on function public.get_visiting_stats() to authenticated;
grant execute on function public.get_visiting_stats() to service_role;
