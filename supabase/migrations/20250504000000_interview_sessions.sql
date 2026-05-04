-- Persists mock-interview state for edge functions (service role bypasses RLS).
create table if not exists public.interview_sessions (
  id uuid primary key default gen_random_uuid(),
  profile jsonb not null default '{}'::jsonb,
  messages jsonb not null default '[]'::jsonb,
  turn_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists interview_sessions_updated_at on public.interview_sessions (updated_at);

alter table public.interview_sessions enable row level security;

-- No policies: anon/authenticated clients cannot access via PostgREST; Edge Functions use the service role (bypasses RLS).

comment on table public.interview_sessions is 'Mock interview transcript; written only from Edge Functions with service role.';
