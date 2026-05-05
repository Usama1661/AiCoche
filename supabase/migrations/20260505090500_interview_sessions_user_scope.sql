-- Ensure mock interview sessions are scoped to authenticated users.

alter table public.interview_sessions
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists title text,
  add column if not exists status text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  add column if not exists score int check (score between 0 and 100),
  add column if not exists feedback jsonb not null default '{}'::jsonb;

create index if not exists interview_sessions_user_id_idx
  on public.interview_sessions (user_id, created_at desc);

alter table public.interview_sessions enable row level security;

drop policy if exists "interview sessions are owned by users" on public.interview_sessions;
create policy "interview sessions are owned by users" on public.interview_sessions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
