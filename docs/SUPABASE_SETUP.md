## Supabase Leaderboard Kurulumu — 0 TL

Bu kurulum Supabase ücretsiz planı ve GitHub Pages ile çalışır. Leaderboard için yalnızca `anon public key` kullan. `service_role` veya secret key'i asla tarayıcıya, repoya ya da GitHub Pages çıktısına koyma.

### 1. Veritabanını hazırla

Supabase Dashboard → SQL Editor bölümünde aşağıdaki dosyanın tamamını bir kez çalıştır:

`supabase/migrations/202608100001_secure_scores.sql`

Migration:

- `scores` tablosuna `submission_id` ekler,
- aynı turun iki kez yazılmasını unique indeksle engeller,
- skor, rumuz ve hafta biçimi için veritabanı kontrolleri ekler,
- anonim kullanıcıya yalnızca okuma ve kontrollü insert izni verir,
- anonim update/delete izni oluşturmaz.

Yeni kurulumda önce tabloyu oluştur:

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

Ardından migration dosyasını çalıştır.

### 2. Siteyi bağla

#### GitHub Pages

Repository → Settings → Secrets and variables → Actions bölümüne şunları ekle:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Deploy iş akışı `supabase-config.js` dosyasını otomatik üretir. Bu değerler public client bağlantısı içindir; güvenlik RLS ve veritabanı constraint'leriyle sağlanır.

#### Yerel geliştirme

1. `config/supabase-config.example.js` dosyasını proje köküne `supabase-config.js` adıyla kopyala.
2. `window.SUPABASE_URL` ve `window.SUPABASE_ANON_KEY` değerlerini doldur.

### Güvenlik sınırı

Bu ücretsiz iyileştirme yanlış biçimli girdileri, bariz skor aralıklarını ve aynı tur kimliğiyle tekrar gönderimi engeller. Oyun kodu kullanıcının tarayıcısında çalıştığı için kararlı bir saldırgan farklı tur kimlikleri üretip sahte skor deneyebilir. Tam anti-cheat için skorun güvenilir bir sunucuda hesaplanması gerekir; bu proje bütçesiz kaldığı sürece leaderboard “topluluk/dürüstlük temelli” kabul edilmelidir.
