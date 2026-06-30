## Supabase Leaderboard Kurulumu

> ÖNEMLİ GÜVENLİK NOTU  
> Leaderboard için **sadece `anon public key`** kullan. `service_role` / `secret` key’i asla client tarafına koyma.

### 1) Tablo (SQL Editor)

```sql
create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nickname text not null,
  score integer not null,
  week_key text not null
);

create index if not exists scores_score_idx on public.scores (score desc);
create index if not exists scores_week_score_idx on public.scores (week_key, score desc);
```

### 2) RLS (Basit, herkese insert/select)

Not: Bu kurulum “kolay başlangıç” içindir. Gerçek anti-cheat istenirse daha sıkı kurallar gerekir.

```sql
alter table public.scores enable row level security;

drop policy if exists "scores_read_all" on public.scores;
create policy "scores_read_all"
on public.scores
for select
to anon
using (true);

drop policy if exists "scores_insert_all" on public.scores;
create policy "scores_insert_all"
on public.scores
for insert
to anon
with check (true);
```

### 3) Siteye bağlama

#### Seçenek A (Önerilen): GitHub Pages deploy sırasında üret

1. GitHub repo ayarlarında `Settings -> Secrets and variables -> Actions` bölümüne şunları ekle:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`  (anon public key)
2. Deploy workflow bu değerlerle otomatik `supabase-config.js` dosyasını üretir ve Pages’a koyar.

#### Seçenek B: Lokal geliştirme

1. `supabase-config.example.js` dosyasını kopyalayıp `supabase-config.js` yap.
2. `supabase-config.js` içindeki:
   - `window.SUPABASE_URL`
   - `window.SUPABASE_ANON_KEY`

alanlarını doldur.
