-- Structured interview plan (question queue, per-turn logs, optional summary) for mock interviews.
alter table public.interview_sessions
  add column if not exists interview_plan jsonb not null default '{}'::jsonb;

comment on column public.interview_sessions.interview_plan is
  'Interview v1: { v, queue[], turns[], summary? } — pre-generated questions and evaluation history.';
