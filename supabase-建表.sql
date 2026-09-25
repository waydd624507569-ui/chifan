-- 吃饭日记 · 云同步建表脚本（在 Supabase 的 SQL Editor 里整段粘贴运行）

create table if not exists chifan_logs (
  code       text primary key,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- 开 RLS 且不给任何策略：直接查表一律被拒，只能走下面两个函数
alter table chifan_logs enable row level security;

create or replace function chifan_get(p_code text)
returns jsonb language sql security definer set search_path = public as $$
  select data from chifan_logs where code = p_code;
$$;

create or replace function chifan_put(p_code text, p_data jsonb)
returns void language sql security definer set search_path = public as $$
  insert into chifan_logs(code, data, updated_at)
  values (p_code, p_data, now())
  on conflict (code) do update set data = excluded.data, updated_at = now();
$$;

revoke all on function chifan_get(text) from public;
revoke all on function chifan_put(text, jsonb) from public;
grant execute on function chifan_get(text) to anon;
grant execute on function chifan_put(text, jsonb) to anon;
