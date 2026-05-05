-- Full Supabase backend for the AI Career Coach app.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  headline text,
  current_designation text,
  current_company text,
  employment_status text default 'open_to_work',
  summary text,
  avatar_url text,
  ai_profile jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.cv_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  file_type text not null,
  file_size bigint not null,
  storage_bucket text not null default 'cv-documents',
  storage_path text not null,
  extracted_text text,
  status text not null default 'uploaded' check (status in ('uploaded', 'processing', 'analyzed', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);

create table if not exists public.cv_analysis_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  cv_document_id uuid not null references public.cv_documents(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  current_designation text,
  summary text,
  experiences jsonb not null default '[]'::jsonb,
  education jsonb not null default '[]'::jsonb,
  skills jsonb not null default '[]'::jsonb,
  certifications jsonb not null default '[]'::jsonb,
  projects jsonb not null default '[]'::jsonb,
  cv_score int check (cv_score between 0 and 100),
  strengths jsonb not null default '[]'::jsonb,
  weaknesses jsonb not null default '[]'::jsonb,
  improvement_suggestions jsonb not null default '[]'::jsonb,
  recommended_skills jsonb not null default '[]'::jsonb,
  job_role_fit jsonb not null default '{}'::jsonb,
  raw_ai_response jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.work_experiences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_name text not null,
  job_title text not null,
  start_date date,
  end_date date,
  is_current boolean not null default false,
  responsibilities text[] not null default '{}',
  achievements text[] not null default '{}',
  skills_used text[] not null default '{}',
  source_cv_document_id uuid references public.cv_documents(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.educations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  institution text not null,
  degree text,
  field_of_study text,
  start_date date,
  end_date date,
  description text,
  source_cv_document_id uuid references public.cv_documents(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text not null default 'technical' check (category in ('technical', 'soft', 'tool', 'language', 'other')),
  proficiency text,
  source_cv_document_id uuid references public.cv_documents(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name, category)
);

create table if not exists public.certifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  issuer text,
  issued_at date,
  expires_at date,
  credential_url text,
  source_cv_document_id uuid references public.cv_documents(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  role text,
  technologies text[] not null default '{}',
  url text,
  source_cv_document_id uuid references public.cv_documents(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.interview_sessions (
  id uuid primary key default gen_random_uuid(),
  profile jsonb not null default '{}'::jsonb,
  messages jsonb not null default '[]'::jsonb,
  turn_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.interview_sessions
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists title text,
  add column if not exists status text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  add column if not exists score int check (score between 0 and 100),
  add column if not exists feedback jsonb not null default '{}'::jsonb;

create table if not exists public.quiz_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  topic text not null,
  difficulty text not null default 'intermediate',
  questions jsonb not null default '[]'::jsonb,
  answers jsonb not null default '[]'::jsonb,
  score int check (score between 0 and 100),
  status text not null default 'generated' check (status in ('generated', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null default 'manual',
  provider_customer_id text,
  provider_subscription_id text,
  plan text not null default 'free',
  status text not null default 'inactive',
  current_period_start timestamptz,
  current_period_end timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cv-documents',
  'cv-documents',
  false,
  10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create index if not exists cv_documents_user_id_idx on public.cv_documents (user_id, created_at desc);
create index if not exists cv_analysis_results_user_id_idx on public.cv_analysis_results (user_id, created_at desc);
create index if not exists work_experiences_user_id_idx on public.work_experiences (user_id);
create index if not exists educations_user_id_idx on public.educations (user_id);
create index if not exists skills_user_id_idx on public.skills (user_id);
create index if not exists certifications_user_id_idx on public.certifications (user_id);
create index if not exists projects_user_id_idx on public.projects (user_id);
create index if not exists interview_sessions_user_id_idx on public.interview_sessions (user_id, created_at desc);
create index if not exists quiz_sessions_user_id_idx on public.quiz_sessions (user_id, created_at desc);
create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_cv_documents_updated_at on public.cv_documents;
create trigger set_cv_documents_updated_at
before update on public.cv_documents
for each row execute function public.set_updated_at();

drop trigger if exists set_work_experiences_updated_at on public.work_experiences;
create trigger set_work_experiences_updated_at
before update on public.work_experiences
for each row execute function public.set_updated_at();

drop trigger if exists set_educations_updated_at on public.educations;
create trigger set_educations_updated_at
before update on public.educations
for each row execute function public.set_updated_at();

drop trigger if exists set_skills_updated_at on public.skills;
create trigger set_skills_updated_at
before update on public.skills
for each row execute function public.set_updated_at();

drop trigger if exists set_certifications_updated_at on public.certifications;
create trigger set_certifications_updated_at
before update on public.certifications
for each row execute function public.set_updated_at();

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists set_interview_sessions_updated_at on public.interview_sessions;
create trigger set_interview_sessions_updated_at
before update on public.interview_sessions
for each row execute function public.set_updated_at();

drop trigger if exists set_quiz_sessions_updated_at on public.quiz_sessions;
create trigger set_quiz_sessions_updated_at
before update on public.quiz_sessions
for each row execute function public.set_updated_at();

drop trigger if exists set_subscriptions_updated_at on public.subscriptions;
create trigger set_subscriptions_updated_at
before update on public.subscriptions
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.cv_documents enable row level security;
alter table public.cv_analysis_results enable row level security;
alter table public.work_experiences enable row level security;
alter table public.educations enable row level security;
alter table public.skills enable row level security;
alter table public.certifications enable row level security;
alter table public.projects enable row level security;
alter table public.interview_sessions enable row level security;
alter table public.quiz_sessions enable row level security;
alter table public.subscriptions enable row level security;

drop policy if exists "profiles are owned by users" on public.profiles;
create policy "profiles are owned by users" on public.profiles
  for all to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "cv documents are owned by users" on public.cv_documents;
create policy "cv documents are owned by users" on public.cv_documents
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "cv analysis results are owned by users" on public.cv_analysis_results;
create policy "cv analysis results are owned by users" on public.cv_analysis_results
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "work experiences are owned by users" on public.work_experiences;
create policy "work experiences are owned by users" on public.work_experiences
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "educations are owned by users" on public.educations;
create policy "educations are owned by users" on public.educations
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "skills are owned by users" on public.skills;
create policy "skills are owned by users" on public.skills
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "certifications are owned by users" on public.certifications;
create policy "certifications are owned by users" on public.certifications
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "projects are owned by users" on public.projects;
create policy "projects are owned by users" on public.projects
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "interview sessions are owned by users" on public.interview_sessions;
create policy "interview sessions are owned by users" on public.interview_sessions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "quiz sessions are owned by users" on public.quiz_sessions;
create policy "quiz sessions are owned by users" on public.quiz_sessions
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "subscriptions are owned by users" on public.subscriptions;
create policy "subscriptions are owned by users" on public.subscriptions
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "users can upload own private cv files" on storage.objects;
create policy "users can upload own private cv files" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'cv-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users can read own private cv files" on storage.objects;
create policy "users can read own private cv files" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'cv-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users can update own private cv files" on storage.objects;
create policy "users can update own private cv files" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'cv-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'cv-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users can delete own private cv files" on storage.objects;
create policy "users can delete own private cv files" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'cv-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

comment on table public.cv_documents is 'Private CV/resume metadata and extracted text.';
comment on table public.cv_analysis_results is 'Structured AI CV analysis output persisted per user and CV.';
comment on table public.profiles is 'Auth user professional profile, auto-filled from CV and manually editable.';
