# BomBlok — Teknik Mimari ve Ürün Denetimi

**Tarih:** 10 Ağustos 2026  
**Kapsam:** Repodaki 46 dosya; HTML/CSS, 19 JavaScript modülü, PWA/service worker, Supabase kurulumu, CI/CD ve 6 test dosyası.  
**Doğrulama:** İlk denetimde 49/49 test başarılıydı. Ücretsiz sağlamlaştırma paketleri sonrasında ESLint sıfır uyarı, 65/65 test, coverage eşikleri, secret taraması ve minimal production build başarılıdır. Production `dist/` paketi gerçek Chromium tarayıcıda masaüstü ve 390×844 mobil viewport ile doğrulandı: modal/odak, klavye yerleştirme, kayıt geri yükleme ve yeni oyun akışları çalıştı; console/CSP hatası görülmedi. Canlı Supabase projesi, gerçek RLS politikaları, üretim telemetrisi ve fiziksel cihazlar bu repodan doğrulanamadığı için bunlara ilişkin sonuçlar açıkça “doğrulanamadı” diye işaretlenmiştir.

## Yönetici özeti

BomBlok, kurulum gerektirmeyen, 8×8 blok yerleştirme oyunu olarak çalışan statik bir PWA’dır. Saf oyun kuralları (`js/rules.js`), güvenli depolama adaptörü (`js/storage.js`), kayıt şeması (`js/run-save-schema.js`), erişilebilir klavye/modallar ve dağıtım kalite kapısı iyi temellerdir. İlk denetimdeki koşulsuz RLS önerisi kaldırıldı; ücretsiz migration artık constraint, unique tur kimliği ve kontrollü insert içeriyor. Ancak skor hâlâ istemcide hesaplandığı için kararlı bir kullanıcı yeni kimliklerle sahte skor üretebilir. Bu nedenle tam rekabet bütünlüğü değil, topluluk/dürüstlük temelli leaderboard sağlanır; migration’ın canlı Supabase’e uygulanıp uygulanmadığı repodan doğrulanamaz.

İkinci ana risk sürdürülebilirliktir. `js/mechanics.js`, `js/main.js` ve yaklaşık 67 KB büyüklüğündeki `style.css` hâlâ büyük sorumluluk alanları taşır. İlk denetimde bulunan `main`, `mechanics`, `grid` ve `missions` arasındaki döngüsel bağımlılıklar callback kayıtlarıyla kaldırılmış ve import grafiği testiyle korunmuştur. DOM, oyun kuralları, zamanlayıcılar, ses, kalıcılık ve iş akışının önemli bölümü yine aynı büyük modüllerde birleşmiştir. Testler 65'e yükselmiş olsa da gerçek hamle/temizleme ve tam tarayıcı akışları için entegrasyon/E2E kapsamı hâlâ eksiktir.

**Genel sonuç:** Tek geliştiricili küçük bir tarayıcı oyunu için işlevsel ve özenli; güvenilir rekabetçi ürün ve büyüyen ekip için henüz yeterince güvenli, gözlemlenebilir ve katmanlı değil. En doğru yatırım sırası: leaderboard güven modeli → temel oyun motorunu DOM’dan ayırma → kritik akış testleri → hata gözlemlenebilirliği → CSS/UI düzenleme.

### Bütçe kısıtı: 0 TL

Projenin dış hizmet ve altyapı bütçesi **0 TL** olarak netleştirilmiştir. Bu nedenle önerilerin uygulanma filtresi şöyledir:

- GitHub Pages/Actions ve Supabase yalnızca ücretsiz plan sınırlarında kullanılmalı.
- ESLint, Node test runner, Playwright, Lighthouse ve Dependabot gibi ücretsiz/açık kaynak araçlar tercih edilmeli.
- Ücretli sunucu, domain, monitoring, analitik, bildirim veya AI API zorunluluğu oluşturulmamalı.
- Ücretsiz kota aşılırsa otomatik ücretli ölçekleme yerine özellik güvenli biçimde sınırlandırılmalı.
- Tam sunucu tarafı anti-cheat bütçesiz modelde garanti edilemeyeceği için leaderboard “topluluk/dürüstlük temelli” olarak açıkça konumlandırılmalı; ücretsiz RLS, constraint, unique tur kimliği ve istemci kilidiyle bariz kötüye kullanım azaltılmalı.
- Aşağıdaki süre tahminleri dışarıya ödenecek bütçeyi değil, geliştirici emeğini ifade eder.

## 1. Genel proje analizi

| Başlık | Sorun / gözlem | Etki | Çözüm | Öncelik |
|---|---|---|---|---|
| Amaç | Ürün amacı README ve arayüzde tutarlı: hızlı, mobil uyumlu blok bulmaca; görev, XP, joker, bomba, buz, başarımlar ve leaderboard içeriyor. | Kapsam anlaşılır; ancak rekabetçi skor güveni ürün vaadiyle uyuşmuyor. | “Yerel casual oyun” ve “doğrulanmış rekabet” hedeflerinden biri açıkça seçilmeli. | Yüksek |
| Güçlü yön | Build gerektirmeyen küçük dağıtım, modül bazlı JS, offline kabuk, merkezi depolama adaptörü, saf kural yardımcıları. | Düşük operasyon maliyeti ve hızlı açılış/geliştirme. | Bu basitliği koruyup yalnızca güven sınırı ve oyun motorunu ayrıştır. | Düşük |
| Kod kalitesi | Büyük orkestratörler sürüyor; karşılıklı importlar ise callback kayıtlarıyla giderildi. | Yan etki yüzeyi hâlâ geniş, fakat başlatma sırası riski azaldı. | Sonraki adım olay/komut tabanlı `GameEngine`; UI adaptörleri motoru çağırmalı. | Yüksek |
| Okunabilirlik | Açıklayıcı yorumlar güçlü; ancak bazı fonksiyonlar çok fazla işi sırayla yapıyor ve boş `catch` blokları niyeti gizliyor. | Hata kökü ve kontrol akışı zor izlenir. | Fonksiyonları use-case’lere ayır; beklenen iptal hatalarını isimle, diğerlerini logla. | Orta |
| Dosya organizasyonu | İşlevsel modüller var fakat domain/UI/infrastructure sınırları yok; `state.js` DOM elemanlarını da export ediyor. | Node testleri doğrudan state/run-save import edemiyor (`run-save-schema.js:5-7`). | `domain/`, `application/`, `adapters/dom/`, `infrastructure/` şeklinde hafif ayrım. | Yüksek |
| Ölçeklenebilirlik | Statik Pages iyi ölçeklenir; her leaderboard açılışında 200 satır çekilip istemcide tekilleştiriliyor (`leaderboard.js:202-220`). | Veri büyüdükçe ağ/DB maliyeti ve sonuç doğruluğu bozulur. | Sunucuda view/RPC ile rumuz başına maksimum skor ve ilk 20 satır. | Yüksek |
| Bakım | Sabit seçiciler, service-worker asset listesi ve çok sayıda state alanı elle eşzamanlanıyor. | Yeni modül/alan eklemek unutma kaynaklı hata yaratır. | Manifest üretimi veya build çıktısı; state reducer ve şema migration’ları. | Orta |
| Teknik borç | Saf kritik modüllerde coverage eşiği eklendi; DOM’a bağlı ana oyun akışları kapsam dışında. | Saf katmanda regression görünürlüğü yüksek, tarayıcı akışlarında sınırlı. | Motoru saflaştırdıkça coverage kapsamına al; Playwright smoke ekle. | Yüksek |

## 2. Mimari değerlendirme

Mevcut yaklaşım küçük PWA için gereksiz framework yükü taşımaması bakımından KISS ile uyumludur. Clean Architecture veya tam DDD uygulamak bu ölçek için gerekli değildir; fakat bağımlılık yönü ters çevrilmelidir.

### Doğrulanan mimari problemler

1. **Döngüsel modül grafiği — Çözüldü.** İlk denetimdeki `main ↔ mechanics`, `grid ↔ mechanics` ve `missions ↔ mechanics` döngüleri kayıt callback’leriyle tek yönlü hale getirildi. `tests/import-graph.test.js` bütün `js/` grafiğini tarayıp yeni bir döngüyü CI’da reddeder.
2. **State ile view birleşmiş — Yüksek.** `state.js:5-44` oyun durumunu, `state.js:46-81` DOM referanslarını aynı modülde sunuyor. Domain katmanının tarayıcı olmadan kurulmasını engelliyor.
3. **God modules — Yüksek.** `mechanics.js` fever, animasyon, bomba, çizgi temizleme, skor, XP, kalıcılık, undo ve reroll’u; `main.js` pointer, placement, boot, modal, PWA ve paylaşımı yönetiyor.
4. **Global singleton ve import-time yan etki — Orta.** Event listener’lar modül yüklenirken bağlanıyor (`main.js:542+`, `audio.js:508+`, `particles.js:271`). Test kurulumu/teardown ve birden fazla oyun instance’ı mümkün değil.
5. **DRY ihlali — Orta.** Döndürme kuralı `main.js:240-266` ile `main.js:306-332` arasında iki kez uygulanıyor. Yorumlarda ortak fonksiyon hedefi yazılmış olsa da pointer kısa-tıklama yolu hâlâ kopya mantığı kullanıyor.

### Önerilen hedef mimari

```text
domain/          saf grid, shape, scoring, bomb, mission kuralları
application/     placeShape, rotateShape, undo, endTurn use-case'leri
adapters/dom/    renderBoard, pointer/keyboard, modal, audio, particles
infrastructure/  storage, leaderboard API, service worker
bootstrap.js     bağımlılıkları oluşturur ve event'leri bağlar
```

Tam DDD yerine tek `GameState` veri modeli ve saf reducer/command fonksiyonları yeterlidir. Observer/Event Bus ancak audio, haptics ve parçacık gibi üçten fazla ikincil etkinin motordan ayrılması için kullanılmalı; aksi halde YAGNI olur.

## 3. Kod kalitesi

### Başlıca kod kokuları

- **Karmaşık temizleme akışı:** `checkAndClearLines()` (`mechanics.js:272-646`) yaklaşık 375 satırlık bir akışta tespit, animasyon, bomba zinciri, buz/taş, görev, XP, skor ve zamanlayıcıları birleştiriyor. Saf `resolveTurn(state)` sonucu `{nextState, events}` üretmeli; UI events’i canlandırmalı.
- **Sessiz hata yutma:** `main.js:270,745,750`, `leaderboard.js:40,222,326`, audio/haptics alanlarında boş `catch` var. Paylaşım iptali beklenen olabilir; clipboard izin hatası kullanıcıya gösterilmelidir. Supabase hata kodu güvenli telemetriye yazılmalıdır.
- **Zayıf runtime tip güvenliği:** JSDoc kısmen var fakat bütün state şekli tanımlı değil. `state` üzerindeki serbest mutasyonlar typo ve geçersiz geçişleri yakalamaz.
- **Eksik kayıt validasyonu:** `isValidGrid` her string’i kabul ediyor (`run-save-schema.js:17`); `timeBombs` yalnızca dizi kontrolünden geçiyor (`:46`); görev ve sayaç alanları doğrulanmıyor. Bozuk/string-enjeksiyonlu kayıt doğrudan state’e alınabilir.
- **`|| 0` semantiği:** `restoreRun` sayaçlarda `save.x || 0` kullanıyor (`run-save.js:63-70`). Bugün çoğu alan için çalışır fakat `NaN`, string ve negatif değerleri de maskeleyebilir. Şema doğrulaması sonrası açık atama yapılmalı.
- **HTML üretimi:** Leaderboard rumuzu `escapeHtml` ile doğru biçimde kaçışlanıyor (`leaderboard.js:15-21,175-185`), fakat DOM düğümleri/textContent kullanmak güvenlik varsayımını daha yapısal hale getirir. Başarım ve combo HTML’leri sabit iç veriden geldiği için mevcut durumda kullanıcı girdili XSS kanıtlanmadı.
- **Naming:** Türkçe domain terimleri ile İngilizce kod adları karışık (`tamisabet`, `sinirdevriyesi`, `Leaderboard`, `reroll`). Çalışmayı bozmaz; yeni katkıcı için sözlük ihtiyacı doğurur.

### Eski / önerilen kod örneği: skor gönderimi

```js
// Mevcut: tarayıcının söylediği skor doğrudan yazılıyor.
await client.from('scores').insert({ nickname, score: state.score, week_key });
```

```js
// Öneri: sunucu oturumu ve hamle özeti doğrulanır; skor sunucuda hesaplanır.
await fetch('/api/runs/finish', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ runId, nickname, moves, integrityToken })
});
```

### Eski / önerilen kod örneği: tur çözümleme

```js
// Mevcut fikir: tek fonksiyon state, DOM, ses, timeout ve depolamayı değiştiriyor.
checkAndClearLines();
```

```js
// Öneri: deterministic motor + yan etki adaptörü.
const { state: next, events } = resolveTurn(current, command);
store.replace(next);
await effects.play(events);
saveRun(next);
```

## 4. Performans analizi

| Bulgu | Kanıt / etki | Çözüm | Öncelik |
|---|---|---|---|
| Her asset için network-first | `sw.js:89-120`; çevrim içiyken tüm same-origin kaynaklar ağ turu bekliyor. Tutarlılık gerekçesi doğru, fakat tekrar ziyaret LCP’sini uzatabilir. | HTML network-first; hash’li JS/CSS için cache-first veya stale-while-revalidate. Basit bir build/hash adımı ekle. | Orta |
| Leaderboard 200 kayıt indiriyor | `leaderboard.js:205-220`; 20 sonuç için 200 satır ve istemci tekilleştirmesi. İlk 200 dışında daha iyi benzersiz oyuncu kaçabilir. | SQL view: `row_number() over(partition by lower(nickname) order by score desc)` ve `limit 20`. | Yüksek |
| DOM yeniden oluşturma | `grid.js:40`, dock için `innerHTML=''`; küçük 8×8 ölçekte kabul edilebilir. | Önce ölç; darboğaz değilse sanal DOM ekleme. Dock için düğüm güncelleme yeterli. | Düşük |
| Animasyon zamanlayıcıları | Mechanics içinde çok sayıda `setTimeout`/çift RAF; yeni oyun `runId` ile bazı eski akışları korusa da bütün callback’lerde iptal görünmüyor. | Merkezi animation scheduler + AbortController/run token; reset’te iptal. | Orta |
| Parçacık/ses maliyeti | Canvas ve prosedürel WebAudio mobil CPU/batarya kullanabilir; gerçek metrik yok. | Long Task, FPS, heap ve battery-aware kalite seviyesi ölç. `prefers-reduced-motion` ve mevcut ayarı bütün efektlere uygula. | Orta |
| Senkron localStorage | Her hamlede kayıt (`run-save.js:21-40`); state küçük olsa da ana thread yazmasıdır. | 100–250 ms debounce, `pagehide` flush; IndexedDB ancak veri büyürse. | Düşük |

**Benchmark planı:** Lighthouse mobile (PWA, accessibility, LCP/INP/CLS); 4× CPU throttling ile 60 saniye drag/clear senaryosu; PerformanceObserver ile long-task sayısı; 500 tur autoplay sonrası heap snapshot; 10k/1m score satırıyla Supabase query `EXPLAIN ANALYZE`; offline-first visit ve deploy sonrası version-skew E2E testi.

## 5. Güvenlik analizi

| Alan | Sonuç | Risk | Düzeltme |
|---|---|---|---|
| Authentication | Oyuncu kimliği yok; rumuz kimlik gibi kullanılıyor. | Yüksek | Supabase anonymous auth/device account veya OAuth; skorları `user_id` ile ilişkilendir. |
| Authorization / anti-cheat | Önerilen insert politikası `with check(true)` ve skor istemci kontrollü. | **Kritik** | Edge Function/RPC üzerinden doğrulama; doğrudan anon insert’i kapat; skor sınırı, nonce, replay koruması ve server-side hesaplama. |
| Input validation | Rumuz 2–16 karaktere normalize ediliyor; DB’de constraint yok. Skor yalnızca pozitif/finite istemci kontrolü. | Yüksek | DB `check(score between 1 and ...)`, nickname uzunluk/karakter constraint’i, server validation. |
| SQL injection | Supabase query builder ve sabit tablo/kolonlar kullanılıyor; kanıtlanmış SQL injection yok. | Düşük | Dinamik SQL eklenirse parametreli RPC kullan. |
| XSS | Leaderboard adı kaçışlanıyor; doğrudan kullanıcı girdisinin güvenli olmayan HTML’e girdiği kanıtlanmadı. CDN script’i supply-chain yüzeyidir. | Orta | `textContent`; CSP; üçüncü taraf script’i paketle veya SRI+pin kullan. |
| CSRF | Cookie tabanlı yetkili backend yok; klasik CSRF şu an uygulanabilir değil. | Düşük | Auth cookie eklenirse SameSite ve CSRF token. |
| SSRF | Backend URL fetch’i yok. | Düşük | Edge Function eklendiğinde allowlist. |
| Rate limit / abuse | İstemcide ve kurulum SQL’inde limit yok. | **Kritik** | Edge Function rate limit; user/IP/device kotası; CAPTCHA yalnızca şüpheli trafikte. |
| Secrets | `supabase-config.js` ignored; CI/local tarama Supabase secret biçimini, service-role JWT’yi ve izlemeye alınmış config’i reddeder. | Düşük | Kontrolü kalite kapısında koru; secret yalnız GitHub/Supabase kasasında. |
| Dependency supply chain | Supabase `@2` major etiketiyle jsDelivr’dan çalıştırılıyor (`index.html:337`), kesin sürüm/SRI yok. Actions sürümleri major tag. | Yüksek | Kesin Supabase sürümü + SRI/self-host; Dependabot; Actions SHA pinleme. |
| CSP ve headers | **Kısmen çözüldü:** meta CSP; script, font, görsel, bağlantı, worker, object ve base kaynaklarını sınırlar. GitHub Pages özel HTTP header sunmaz. | Düşük | Politikayı testle koru; ileride header destekli ücretsiz katman ancak gerçek ihtiyaç oluşursa değerlendir. |
| Hassas veri | Rumuz localStorage ve public leaderboard’da; gizlilik metni/silme akışı yok. | Orta | Açık rıza/metin, rumuz silme/değiştirme, retention ve moderasyon politikası. |
| Dosya yükleme | Özellik yok. | Uygulanamaz | Eklenirse MIME+magic byte, boyut limiti, ayrı bucket ve zararlı tarama. |

**Doğrulanamayan nokta:** Repodaki SQL yalnızca kurulum dokümanıdır. Canlı Supabase’in gerçekten aynı politikaları kullandığı, ek WAF/rate limit bulunduğu veya tabloda constraint olduğu bu kaynaklardan belirlenemez.

## 6. Frontend, UX, erişilebilirlik ve SEO

### Olumlu uygulamalar

- Türkçe `lang`, açıklama, canonical, Open Graph/Twitter metaları mevcut (`index.html:2-35`).
- Zoom engellenmemiş; bu erişilebilirlik için doğru (`index.html:5-7`).
- Klavye modülü, canlı bölge, odak tuzağı ve reduce-motion ayarı var.
- Mobil viewport ve PWA manifest/service worker sağlanmış.

### Sorunlar

1. **Bazı ikon butonları yalnızca `title` taşıyor — Orta.** Leaderboard ve yardım butonlarında açık `aria-label` yok (`index.html:54-55`); title erişilebilir isim olarak tutarlı değildir.
2. **PWA kapatma butonu etiketsiz — Orta.** `index.html:43` yalnızca × içeriyor.
3. **Modal semantiği HTML’de tutarsız — Orta.** Help/leaderboard/game-over başlangıç markup’ında dialog rolleri yok; `createModal` runtime’da ekliyorsa JS başarısız olduğunda semantik kaybolur. Statik olarak da tanımla.
4. **Tema seçici ARIA modeli eksik olabilir — Orta.** `role=listbox` altında button elemanları `role=option`/`aria-selected` taşımıyor (`index.html:57-66`). Native select veya menu button pattern kullan.
5. **CSS ölçeği — Orta.** `style.css` yaklaşık 67 KB ve `themes.css` 13.7 KB; component/token katmanı olmadan regression riski büyür. CSS custom properties + bileşen dosyaları + kullanılmayan selector denetimi.
6. **İlk kullanım yükü — Orta.** Aynı ekranda skor, seviye, beş kontrol, görev, grid ve dock bulunuyor. Yeni kullanıcı için progressive disclosure ve ilk üç hamlede koçluk önerilir.
7. **SEO yapısal veri yok — Düşük.** `VideoGame`/`WebApplication` JSON-LD ve gerçek içerik sayfası bulunmuyor. Oyun keşfedilebilirliği hedefse eklenebilir.
8. **Hata geri bildirimi zayıf — Orta.** Clipboard ve bazı ağ hataları sessiz kalıyor; retry/offline durumu açık değil.

Responsive davranışın gerçek cihaz matrisiyle doğrulandığına dair E2E veya görsel regression testi yoktur; CSS varlığı tek başına doğrulama sayılmaz.

## 7. Backend ve API analizi

Projede uygulamaya ait backend katmanı yoktur; tarayıcı Supabase Data API’ye doğrudan bağlanır. Bu yüzden klasik controller/service/repository, transaction ve middleware değerlendirmesi uygulanamaz. Mevcut API erişiminde:

- Okuma sorgusu kolonları sınırlar ve indeks dokümanda tanımlıdır.
- Yazma idempotent değildir; aynı skor butona tekrar basılarak sınırsız eklenebilir.
- Submit sırasında buton kilitlenmediği için çift tıklama paralel insert üretebilir.
- Timeout/retry/backoff yoktur.
- Hata türleri kullanıcıya tek genel mesajla verilir; operasyonel log yoktur.

Öneri: `finish-run` Edge Function’ı tek yazma kapısı olsun; `idempotency_key` unique constraint’i, transaction ve rate limit uygulasın. Public read için materialized view/RPC kullanılabilir.

## 8. Veritabanı analizi

Mevcut doküman şeması tek `scores` tablosudur (`SUPABASE_SETUP.md:9-19`). Bu küçük kapsam için normalizasyon sorunu yoktur ve `(week_key, score desc)` indeksi haftalık sorguyla uyumludur. Eksikler:

- `nickname`, `score`, `week_key` için CHECK constraint yok.
- Kullanıcı kimliği/foreign key yok; rumuz bazlı tekilleştirme güvenilir değildir.
- Aynı run’ın tekrar gönderimini önleyen unique key yok.
- Global sorgu için `score desc` indeksi mevcut; haftalık için birleşik indeks mevcut, bu iyi.
- Migration dosyası/sürümü/rollback yok; sadece Markdown içindeki SQL var.
- Retention, backup/restore testi ve moderasyon/silme modeli yok.
- İstemcide ISO hafta hesaplamak saat/dil sınırı hatalarına ve sahte week key’e açıktır; DB `created_at` üzerinden hafta türetmeli.

Önerilen çekirdek kolonlar: `user_id uuid references auth.users`, `run_id uuid unique`, `score int check`, `nickname varchar(16) check`, `created_at`, sunucu tarafından üretilen `week_start date`. SQL migration’ları `supabase/migrations/` altında izlenmelidir.

## 9. DevOps ve operasyon

**İyi:** `main` push’unda Pages deploy, PR’da lint/test kalite kapısı, `npm ci`, concurrency ve en az permissions tanımlı. Supabase config deploy sırasında üretiliyor.

**Eksikler:**

- Docker bu statik Pages ürünü için gerekli değil; eklememek KISS’e uygundur.
- CI’a ücretsiz high-severity dependency audit, Dependabot, secret scan ve coverage eşikleri eklendi; tarayıcı E2E ve Lighthouse bütçesi hâlâ yok.
- Actions ve CDN bağımlılıkları immutable SHA/sürümle pinli değil.
- Monitoring/error tracking, uptime check ve release marker yok.
- Health check/backend olmadığı için uygulanamaz; fakat Pages URL smoke test yapılabilir.
- Supabase backup/PITR ve restore tatbikatı dokümante değil.
- Service-worker install sırasında her `cache.add` hatası yutuluyor (`sw.js:67-69`); eksik app shell ile install başarılı sayılabilir.
- **Çözüldü:** Deploy yalnızca 35 dosyalı yaklaşık 615 KB minimal `dist/` paketini yayınlar; test, script, migration, paket ve repo metadatası dışarıda kalır.

## 10. Test analizi

Mevcut 65 test; zorluk ayarları, sabitler, saf grid/döndürme kuralları, güçlendirilmiş kayıt şeması, gönderim kimliği, erişilebilir/CSP uyumlu HTML, import grafiği, minimal deploy tanımı, storage fallback ve service-worker asset listesini kapsıyor. Saf kritik modüllerde ölçülen toplam kapsam %94,80 satır, %93,21 branch ve %94,44 fonksiyondur; kalite eşikleri sırasıyla %90/%85/%85’tir. DOM’a bağlı `main/mechanics/missions` bu sayıların kapsamında değildir.

**En önemli eksik testler:**

1. Place → clear → bomb chain → score/XP/mission bütünleşmesi.
2. Undo/reroll/rotation joker ekonomisi ve sayfa yenilemeyle hak tazelenmemesi.
3. Oyun sonu tespiti; döndürmeyle sığabilen şeklin yanlış game-over üretmemesi.
4. Zamanlayıcı resetleri: fever, görev ve bomba callback’lerinin yeni oyuna sızmaması.
5. Leaderboard nickname doğrulama, XSS payload, çift submit, ağ/RLS hatası.
6. Klavye ile tam oyun akışı ve modal focus restore.
7. Offline ilk tekrar ziyaret, SW güncelleme ve eski cache temizliği.
8. Mobil pointer drag/drop ve responsive görsel regression.

Refactor’dan önce jsdom eklemek yerine önce domain motorunu saflaştırmak daha değerlidir. Ardından Vitest/Node test ile motor, Playwright ile 5–8 kritik kullanıcı yolculuğu test edilmelidir. Coverage başlangıç kapısı: domain için %90 branch, tüm repo için %70 line; zamanla artırılmalı.

## 11. Kullanıcı deneyimi

- İlk ekranda kontrol yoğunluğu yüksektir; ilk oturumda joker/XP/görevleri kademeli aç.
- Rumuzun public olduğu ve kalıcı saklandığı açıkça anlatılmıyor; gönderim öncesi kısa gizlilik metni ekle.
- Offline leaderboard durumunda “ayar gerekli” mesajı son kullanıcıya teknik geliyor; “Çevrim dışısın, skor cihazında saklandı” gibi ürün dili kullan.
- Skor gönderiminde başarı sonrası kalıcı işaret/idempotency yok; kullanıcı aynı skoru tekrar gönderebilir.
- Yardım uzun bir modal; bağlama duyarlı ilk-run ipuçları daha az tıklama ister.
- Tema, ses, haptik ve hareket azaltma iyi kişiselleştirme seçenekleridir; ayarların cihazlar arası senkronu yoktur.
- Oyun sonu ekranında “neden bitti?” ve olası en iyi hamle/istatistik özeti yoktur.

## 12. Yeni özellik önerileri

| # | Özellik | Neden / kullanıcı faydası | Zorluk | Tahmin | Öncelik |
|---:|---|---|---|---:|---|
| 1 | Güvenli hesap ve doğrulanmış leaderboard | Rekabet güveni, cihazlar arası kimlik | Yüksek | 2–4 hf | Kritik |
| 2 | Günlük challenge + seed | Herkes aynı tahtada yarışır, retention | Orta | 1–2 hf | Yüksek |
| 3 | Run replay/doğrulama | Anti-cheat, paylaşılabilir oyun | Yüksek | 3–5 hf | Yüksek |
| 4 | Bulut senkronizasyonu | İlerleme cihazlar arasında korunur | Orta | 1–2 hf | Yüksek |
| 5 | İlk kullanım koçu | Öğrenme yükünü azaltır | Düşük | 2–4 gün | Yüksek |
| 6 | Oyun sonu analiz kartı | Oyuncu neden kaybettiğini öğrenir | Orta | 1 hf | Yüksek |
| 7 | Streak/takvim | Geri dönüş alışkanlığı | Orta | 1 hf | Yüksek |
| 8 | Arkadaş leaderboard’u | Sosyal rekabet ve davet büyümesi | Orta | 1–2 hf | Orta |
| 9 | Paylaşılabilir skor görseli | Organik edinim | Orta | 3–5 gün | Yüksek |
| 10 | Haftalık ligler | Uzun dönem ilerleme | Yüksek | 3–4 hf | Orta |
| 11 | Görev yeniden seçme | Kötü görev kaynaklı sürtünmeyi azaltır | Düşük | 1–2 gün | Orta |
| 12 | İstatistik paneli | En iyi combo, clear, süre, tercih edilen tema | Orta | 3–5 gün | Orta |
| 13 | Erişilebilir renk/konstrast modları | Renk görme farklılıklarında oynanabilirlik | Orta | 3–5 gün | Yüksek |
| 14 | Undo önizlemesi | Joker harcamadan sonucu anlamayı sağlar | Düşük | 2–3 gün | Orta |
| 15 | Sezonluk kozmetik tema | Gelir; pay-to-win olmadan kişiselleştirme | Orta | 1–2 hf | Orta |
| 16 | Reklamsız/tema paketi satın alma | Etik gelir modeli | Yüksek | 2–4 hf | Düşük |
| 17 | Push bildirim tercihleri | Günlük challenge/streak hatırlatma | Orta | 1–2 hf | Orta |
| 18 | Yönetim/moderasyon paneli | Uygunsuz rumuz ve sahte skor yönetimi | Yüksek | 2–3 hf | Yüksek |
| 19 | Ürün analitiği funnel’ı | Tutorial→ilk oyun→geri dönüş kaybını ölçer | Orta | 3–5 gün | Yüksek |
| 20 | İpucu/AI koç (opsiyonel) | Tahtadaki iyi hamleyi açıklar; öğrenme sağlar | Yüksek | 2–4 hf | Düşük |

Tahminler tek deneyimli geliştirici, tasarım ve backend erişimi hazır varsayımıyla kaba iş günü/hafta aralığıdır; keşif sonrası yeniden tahmin edilmelidir. AI koç için önce deterministik move search tercih edilmelidir; LLM bu kapalı problemde maliyet ve belirsizlik ekler.

## 13. Teknik borç listesi

| Sorun | Dosya | Etki | Çözüm | Öncelik |
|---|---|---|---|---|
| İstemci kontrollü anonim skor | `js/leaderboard.js`, `SUPABASE_SETUP.md` | Sahte leaderboard | Server doğrulama, auth, rate limit | Kritik |
| Koşulsuz RLS insert | `SUPABASE_SETUP.md:35-40` | Otomatik spam/veri maliyeti | Doğrudan anon insert’i kapat | Kritik |
| Döngüsel import | `main.js`, `mechanics.js`, `grid.js`, `missions.js` | **Çözüldü:** callback kayıtları + import grafiği testi | Tek yönlü yapıyı koru | Tamamlandı |
| 375 satırlık turn resolver | `js/mechanics.js:272-646` | Regression/test zorluğu | Saf motor + event listesi | Yüksek |
| State ve DOM birleşimi | `js/state.js` | Node testi/yeniden kullanım engeli | Store ve DOM refs ayır | Yüksek |
| Eksik kayıt şeması | `js/run-save-schema.js` | Bozuk state kabulü | Enum ve tüm alan validasyonu | Yüksek |
| Kritik entegrasyon/E2E testi yok | `tests/` | CI’da kaçan kullanıcı hataları | Motor + Playwright testleri | Yüksek |
| İstemcide leaderboard dedupe | `js/leaderboard.js:202-220` | Ağ/DB maliyeti, eksik sonuç | SQL view/RPC | Yüksek |
| CDN sürümü/SRI pinli değil | `index.html:337` | Supply-chain riski | Exact version + SRI/self-host | Yüksek |
| Çift skor submit koruması yok | `js/leaderboard.js:297-328` | Duplicate kayıt | Buton kilidi + idempotency key | Yüksek |
| Hatalar sessiz yutuluyor | Çoklu JS dosyası | Destek/teşhis zorluğu | Beklenen hata ayrımı + telemetry | Orta |
| SW precache hataları yutuluyor | `sw.js:67-69` | Eksik offline shell | Kritik asset fail-fast, optional ayrı | Orta |
| Build artefact tüm repo | `.github/workflows/deploy.yml`, `scripts/build-dist.js` | **Çözüldü:** yalnız minimal `dist/` yayınlanıyor | Allowlist ve testi koru | Tamamlandı |
| Migration sistemi yok | `SUPABASE_SETUP.md` | Şema drift/rollback yok | Supabase migrations | Orta |
| Monolitik CSS | `style.css`, `themes.css` | Görsel regression | Token/component katmanı | Orta |
| Runtime type modeli yok | `js/state.js` ve use-case’ler | Geçersiz state | JSDoc typedef + `tsc --checkJs` veya TS | Orta |
| Privacy/retention yok | Leaderboard UI/docs | Kullanıcı güveni/uyum | Açıklama, silme, retention | Orta |
| Monitoring yok | CI/production | Hata görünmezliği | Error + uptime + Web Vitals | Orta |
| Pointer rotation duplicate | `js/main.js:240-266,306-332` | Kural ayrışması | Tek `rotateDockBlock` çağrısı | Orta |
| Coverage eşiği yok | `package.json`, CI | Yanıltıcı yeşil kapı | Coverage raporu/bütçesi | Orta |

## 14. Refactor yol haritası

### Faz 0 — Güvenlik ve veri koruma (1–2 hafta)

1. Anon doğrudan score insert’ini kapat; geçici olarak leaderboard’u “beta/doğrulanmamış” etiketle.
2. DB constraint, migration ve idempotency key ekle.
3. Edge Function + rate limit + auth/device identity kur.
4. Exact Supabase sürümü, CSP ve dependency/secret scan ekle.

### Faz 1 — Davranışı sabitle (1 hafta)

1. Mevcut kritik akışlar için characterization testleri yaz.
2. `checkAndClearLines`, jokerler, game-over ve reset zamanlayıcı senaryolarını kapsa.
3. Playwright ile mobil pointer, keyboard, offline ve leaderboard hata yolları ekle.

### Faz 2 — Oyun motorunu ayır (2–3 hafta)

1. DOM’suz `GameState` ve command tiplerini tanımla.
2. Placement, rotation ve turn resolution’ı saf fonksiyonlara taşı.
3. Motorun `{state, events}` döndürmesini sağla.
4. Audio/particle/haptic/storage adaptörlerini events’e bağla.
5. Döngüsel importlar kaldırıldı; sonraki adım callback kayıtlarını ayrı bir bootstrap composition root’unda toplamak.

### Faz 3 — Performans ve dayanıklılık (1–2 hafta)

1. Ölçüm baseline’ı al; long task/FPS/Web Vitals bütçeleri koy.
2. Leaderboard dedupe/limit’i DB’ye taşı.
3. Timeout/RAF lifecycle’ını tek scheduler’da iptal edilebilir yap.
4. Minimal hash’li `dist/` ve uygun SW cache stratejisi üret.

### Faz 4 — Kod/UI temizliği (1–2 hafta)

1. CSS token ve component bölümü; dead selector temizliği.
2. Tüm ikon butonlarına accessible name, tema seçiciye doğru ARIA pattern.
3. Hata mesajları, offline hali ve ilk kullanım onboarding’i.
4. CheckJS/TypeScript ile state ve API payload tip kontrolü.

### Faz 5 — Ürün büyümesi

Önce günlük challenge, oyun sonu analizi, istatistik ve paylaşım kartı; ölçümler retention etkisini gösterirse lig, sosyal ve kozmetik gelir özellikleri.

## 15. Nihai puanlama

| Başlık | Puan / 10 | Gerekçe |
|---|---:|---|
| Kod Kalitesi | 6.5 | İyi saf yardımcılar ve yorumlar; büyük, yan etkili fonksiyonlar |
| Mimari | 5.5 | Modüler dosyalar var; katman sınırı ve import yönü zayıf |
| Güvenlik | 3.5 | XSS/secret yaklaşımı makul; leaderboard güven modeli kritik açık |
| Performans | 6.5 | Küçük vanilla uygulama; ölçüm yok, network-first ve ağır efekt riski |
| Ölçeklenebilirlik | 5.0 | Statik frontend güçlü; score sorgusu ve güven modeli büyümeye uygun değil |
| Bakım Kolaylığı | 5.5 | Merkezi yardımcılar var; god module/CSS ve yan etkiler maliyetli |
| Okunabilirlik | 7.0 | Açıklayıcı adlar/yorumlar; uzun akışlar ve karışık dil düşürüyor |
| Test Edilebilirlik | 5.0 | Saf parçalar iyi; ana oyun DOM’a sıkı bağlı ve kapsanmıyor |
| UX | 7.0 | Mobil/PWA/ayar/klavye özeni; yoğun ekran ve hata/onboarding eksikleri |
| Genel Kalite | 6.0 | Güçlü hobi/indie temeli; profesyonel rekabet ve operasyon seviyesi eksik |

Puanlar yalnızca repoda doğrulanabilen kanıtlara dayanır; üretim kullanım verisi veya cihaz testi dahil değildir.

## 16. Sonuç

### Güçlü yönler

- Framework ve build zorunluluğu olmadan çalışan kompakt PWA.
- Saf `rules.js`, merkezi storage fallback’i ve sürümlü run-save doğrulaması.
- Lint + 65 test + coverage + secret scan + minimal build + dependency audit içeren ücretsiz CI kalite kapısı.
- Klavye, modal odak yönetimi, zoom ve hareket azaltma gibi erişilebilirlik yatırımları.
- Service worker version-skew probleminin bilinçli ele alınması.

### Kritik sorunlar

- Anonim, istemci kontrollü ve rate-limit’siz leaderboard bütünlüğü.
- Oyun motoru ile DOM/animasyon/kalıcılığın büyük modüllerde birleşmesi.
- Ana oyun, UI ve ağ akışlarını kapsamayan test paketi.

### Hızlı kazanımlar

- Skor gönderirken butonu kilitle, idempotency key ve DB CHECK constraint ekle.
- Pointer kısa-tıklama döndürmesini ortak `rotateDockBlock` fonksiyonuna yönlendir.
- İkon butonlarına `aria-label`; tema menüsüne doğru semantics ekle.
- CSP eklendi; kalan iş Supabase CDN sürümünü kesin pinlemek.
- Coverage ile secret/dependency scan eklendi; kalan iş Playwright smoke testidir.
- Service-worker kritik asset cache hatalarını fail-fast yap.

### En öncelikli 10 düzeltme

1. Doğrudan anonim score insert’ini kapat.
2. Sunucu tarafı skor doğrulama, auth/device identity ve rate limit ekle.
3. DB migration, constraint, user/run kimliği ve idempotency kur.
4. Kritik oyun akışları için characterization/integration testleri yaz.
5. `resolveTurn` oyun motorunu DOM’dan ayır.
6. Çözülmüş döngüsel import yapısını koruyup tek composition root oluştur.
7. Leaderboard tekilleştirme/top-20 sorgusunu DB’ye taşı.
8. Zamanlayıcı/RAF lifecycle’ını reset sırasında güvenle iptal et.
9. CSP, exact dependency pinning ve security scan ekle.
10. Erişilebilirlik, onboarding ve kullanıcı dostu offline/hata durumlarını tamamla.

### En faydalı 20 yeni özellik

Öncelik sırası: güvenli hesap/leaderboard, günlük challenge, replay doğrulama, bulut senkronu, onboarding, oyun sonu analiz kartı, streak, arkadaş leaderboard’u, skor görseli, ligler, görev yenileme, istatistik, renk erişilebilirliği, undo önizleme, kozmetik tema, reklamsız paket, bildirimler, moderasyon paneli, ürün analitiği ve deterministik/AI koç.

### Genel değerlendirme

BomBlok’un teknik temeli rastgele büyümüş bir prototipten daha iyi durumdadır: geliştirici geçmiş hataları yorumlarla belgelemiş, depolama ve saf kuralları ayırmış, CI kurmuş ve erişilebilirliği düşünmüştür. Bununla birlikte mevcut mimari bir sonraki büyüme evresinde değişiklik hızını düşürür. Özellikle `mechanics.js` ve `main.js` her yeni mekaniğin aynı yan etkili akışa eklenmesine neden olmaktadır.

Uzun vadeli sürdürülebilirlik için framework değişimi şart değildir. En yüksek getirili hareket, mevcut vanilla JavaScript’i koruyarak deterministic bir domain motoru ve ince DOM adaptörleri oluşturmaktır. Ölçeklenebilirlikte asıl darboğaz frontend teknoloji seçimi değil, leaderboard’un güven ve sorgu modelidir. Bu iki alan çözüldüğünde proje, profesyonel olarak işletilebilir küçük bir oyun ürününe dönüşebilir; çözülmeden büyüme/gelir özellikleri eklemek sahte skor, destek yükü ve regression borcunu büyütür.
