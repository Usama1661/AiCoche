create table if not exists public.ai_project_recommendation_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_snapshot jsonb not null default '{}'::jsonb,
  metrics_snapshot jsonb not null default '{}'::jsonb,
  recommendations jsonb not null default '[]'::jsonb,
  chats jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ai_project_recommendation_sessions_user_id_idx
  on public.ai_project_recommendation_sessions (user_id, updated_at desc);

drop trigger if exists set_ai_project_recommendation_sessions_updated_at on public.ai_project_recommendation_sessions;
create trigger set_ai_project_recommendation_sessions_updated_at
before update on public.ai_project_recommendation_sessions
for each row execute function public.set_updated_at();

alter table public.ai_project_recommendation_sessions enable row level security;

drop policy if exists "ai project recommendation sessions are owned by users" on public.ai_project_recommendation_sessions;
create policy "ai project recommendation sessions are owned by users" on public.ai_project_recommendation_sessions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

comment on table public.ai_project_recommendation_sessions is 'AI-generated project recommendations and per-project coach chats.';
