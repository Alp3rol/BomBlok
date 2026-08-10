-- BomBlok ücretsiz plan uyumlu leaderboard sağlamlaştırması.
-- Supabase Dashboard > SQL Editor içinde bir kez çalıştırılabilir.
-- Bu migration dürüst kullanıcıların çift gönderimini ve bariz geçersiz girdileri engeller.
-- İstemci taraflı bir oyunda tek başına tam anti-cheat sağlamaz.

create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nickname text not null,
  score integer not null,
  week_key text not null
);

create index if not exists scores_score_idx on public.scores (score desc);
create index if not exists scores_week_score_idx on public.scores (week_key, score desc);

alter table public.scores
  add column if not exists submission_id text;

-- Eski kayıtlar submission_id taşımayabilir. Yeni kayıtlar için aşağıdaki RLS kontrolü
-- alanı zorunlu kılar; böylece tabloyu kilitlemeden geriye dönük uyumluluk korunur.
create unique index if not exists scores_submission_id_unique_idx
  on public.scores (submission_id)
  where submission_id is not null;

alter table public.scores
  drop constraint if exists scores_nickname_length_check,
  drop constraint if exists scores_score_range_check,
  drop constraint if exists scores_week_key_format_check,
  drop constraint if exists scores_submission_id_length_check;

alter table public.scores
  add constraint scores_nickname_length_check
    check (char_length(btrim(nickname)) between 2 and 16),
  add constraint scores_score_range_check
    check (score between 1 and 100000000),
  add constraint scores_week_key_format_check
    check (week_key ~ '^[0-9]{4}-W(0[1-9]|[1-4][0-9]|5[0-3])$'),
  add constraint scores_submission_id_length_check
    check (submission_id is null or char_length(submission_id) between 16 and 128);

alter table public.scores enable row level security;

drop policy if exists "scores_read_all" on public.scores;
create policy "scores_read_all"
on public.scores
for select
to anon
using (true);

drop policy if exists "scores_insert_all" on public.scores;
drop policy if exists "scores_insert_valid" on public.scores;
create policy "scores_insert_valid" 
on public.scores
for insert
to anon
with check (
  submission_id is not null
  and char_length(submission_id) between 16 and 128
  and char_length(btrim(nickname)) between 2 and 16
  and score between 1 and 100000000
  and week_key ~ '^[0-9]{4}-W(0[1-9]|[1-4][0-9]|5[0-3])$'
);

-- İstemci skorları değiştiremesin veya silemesin. Daha önce elle eklenmiş politika varsa temizle.
drop policy if exists "scores_update_all" on public.scores;
drop policy if exists "scores_delete_all" on public.scores;
