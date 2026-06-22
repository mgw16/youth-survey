-- ============================================================================
--  Woolgrower survey - Supabase schema
--  Paste this whole file into Supabase  ->  SQL Editor  ->  New query  ->  Run.
-- ============================================================================

-- 1. Growers (one row per person who starts the survey) -----------------------
create table if not exists public.growers (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  property_name text,
  created_at    timestamptz not null default now()
);

-- 2. Responses (one row per answered question) --------------------------------
create table if not exists public.responses (
  id          uuid primary key default gen_random_uuid(),
  grower_id   uuid not null references public.growers(id) on delete cascade,
  survey_id   text not null,
  question_id text not null,
  value       jsonb,
  answered_at timestamptz not null default now()
);

-- one answer per grower/survey/question (lets the app overwrite on re-answer)
create unique index if not exists responses_unique
  on public.responses (grower_id, survey_id, question_id);
create index if not exists responses_grower_idx on public.responses (grower_id);
create index if not exists responses_survey_idx on public.responses (survey_id);

-- 2b. Question wording overrides ---------------------------------------------
-- Lets you reword questions from the dashboard without changing question ids,
-- so previously-collected answers stay matched to the same question.
create table if not exists public.question_overrides (
  id            uuid primary key default gen_random_uuid(),
  survey_id     text not null,
  question_id   text not null,
  prompt        text,
  help          text,
  instructions  text,
  option_labels jsonb,
  updated_at    timestamptz not null default now()
);

create unique index if not exists question_overrides_unique
  on public.question_overrides (survey_id, question_id);

-- 3. Realtime: let the dashboard receive live changes -------------------------
alter publication supabase_realtime add table public.growers;
alter publication supabase_realtime add table public.responses;

-- 4. Row Level Security -------------------------------------------------------
-- Workshop setting: the app uses the public anon key, so we allow the basic
-- operations it needs. Growers can add themselves and their answers; the
-- dashboard can read everything. See DEPLOY.md "Locking down the dashboard"
-- for a stricter setup if you ever need one.
alter table public.growers   enable row level security;
alter table public.responses enable row level security;
alter table public.question_overrides enable row level security;

create policy "anyone can add a grower" on public.growers
  for insert to anon, authenticated with check (true);
create policy "anyone can read growers" on public.growers
  for select to anon, authenticated using (true);

create policy "anyone can add a response" on public.responses
  for insert to anon, authenticated with check (true);
create policy "anyone can update a response" on public.responses
  for update to anon, authenticated using (true) with check (true);
create policy "anyone can read responses" on public.responses
  for select to anon, authenticated using (true);

-- Question overrides: readable by everyone (the survey app needs them), and
-- writable so the facilitator can edit wording from the dashboard.
create policy "anyone can read overrides" on public.question_overrides
  for select to anon, authenticated using (true);
create policy "anyone can write overrides" on public.question_overrides
  for insert to anon, authenticated with check (true);
create policy "anyone can update overrides" on public.question_overrides
  for update to anon, authenticated using (true) with check (true);

-- ============================================================================
--  BUILDER TABLES  (added for the in-dashboard survey builder)
--  These let you add new sections and questions from the dashboard. They store
--  the survey STRUCTURE you build; growers' answers still go in `responses`.
-- ============================================================================

create table if not exists public.custom_sections (
  id         uuid primary key default gen_random_uuid(),
  section_id text not null unique,
  title      text not null,
  intro      text,
  position   int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.custom_questions (
  id           uuid primary key default gen_random_uuid(),
  question_id  text not null unique,
  section_id   text not null,
  type         text not null,
  prompt       text,
  help         text,
  instructions text,
  options      jsonb,
  position     int not null default 0,
  created_at   timestamptz not null default now()
);

alter publication supabase_realtime add table public.custom_sections;
alter publication supabase_realtime add table public.custom_questions;

alter table public.custom_sections  enable row level security;
alter table public.custom_questions enable row level security;

create policy "read custom_sections"   on public.custom_sections   for select to anon, authenticated using (true);
create policy "write custom_sections"  on public.custom_sections   for insert to anon, authenticated with check (true);
create policy "update custom_sections" on public.custom_sections   for update to anon, authenticated using (true) with check (true);
create policy "delete custom_sections" on public.custom_sections   for delete to anon, authenticated using (true);

create policy "read custom_questions"   on public.custom_questions  for select to anon, authenticated using (true);
create policy "write custom_questions"  on public.custom_questions  for insert to anon, authenticated with check (true);
create policy "update custom_questions" on public.custom_questions  for update to anon, authenticated using (true) with check (true);
create policy "delete custom_questions" on public.custom_questions  for delete to anon, authenticated using (true);
