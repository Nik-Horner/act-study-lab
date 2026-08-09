-- ACT English Lab: multi-user schema.
-- Content (topics/lessons/questions/exams) is static JSON shipped with the app,
-- NOT stored in the DB. These tables hold per-user state only.

create extension if not exists pgcrypto;

-- One row per user, created automatically on signup (see trigger below).
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  target_score smallint check (target_score between 1 and 36),
  test_date date,
  created_at timestamptz not null default now()
);

-- Per-user, per-topic mastery (streak-based, mirrors the old localStorage model).
create table public.topic_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  topic_slug text not null,
  attempts int not null default 0,
  correct int not null default 0,
  current_streak int not null default 0,
  best_streak int not null default 0,
  last_practiced_at timestamptz,
  primary key (user_id, topic_slug)
);

-- Missed drill questions, cleared when answered correctly again ("review misses" mode).
create table public.question_misses (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id text not null,
  topic_slug text not null,
  missed_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

-- Completed full-length practice exams.
create table public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id text not null,
  answers jsonb not null,
  raw_correct int not null,
  raw_total int not null,
  scale_score smallint not null,
  duration_seconds int,
  completed_at timestamptz not null default now()
);

-- Manual checkbox items on the day-by-day plan (exam/review/weak-topics/rest days).
create table public.plan_checks (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_key text not null,
  checked_at timestamptz not null default now(),
  primary key (user_id, item_key)
);

create index topic_progress_user_idx on public.topic_progress(user_id);
create index question_misses_user_idx on public.question_misses(user_id);
create index exam_attempts_user_idx on public.exam_attempts(user_id);
create index plan_checks_user_idx on public.plan_checks(user_id);

-- Auto-create a profile row when a new auth user signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Row-level security: every user can only ever touch their own rows.
alter table public.profiles enable row level security;
alter table public.topic_progress enable row level security;
alter table public.question_misses enable row level security;
alter table public.exam_attempts enable row level security;
alter table public.plan_checks enable row level security;

create policy "profiles: owner read" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles: owner update" on public.profiles
  for update using (auth.uid() = id);

create policy "topic_progress: owner all" on public.topic_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "question_misses: owner all" on public.question_misses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "exam_attempts: owner all" on public.exam_attempts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "plan_checks: owner all" on public.plan_checks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
