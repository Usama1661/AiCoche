alter table public.ai_project_recommendation_sessions
  add column if not exists completed_project_ids jsonb not null default '[]'::jsonb;
