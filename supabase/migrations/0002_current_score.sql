-- Optional starting/baseline score, shown alongside target_score so users can
-- see the gap they're closing (e.g. "24 → 34").
alter table public.profiles
  add column current_score smallint check (current_score between 1 and 36);
