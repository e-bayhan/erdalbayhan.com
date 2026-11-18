# erdalbayhan.com — Proje Rehberi

## Proje Özeti

On-Duty Masters (Erdal Bayhan) ajans sitesi: SEO, GEO ve AI Search odaklı.  
Tek sayfa, bölümlü editoryal yapı (scroll-craft skill'i ile tasarlandı, Kasım 2026), statik, mobil öncelikli.  
Hostinger'da barındırılır; build adımı yok (TR sayfa üretimi commit hook'unda).

## Tech Stack

- **HTML5**: semantik yapı, kaynak tek `index.html` (TR sürümü üretilir)
- **scroll-craft engine** (`scrollcraft.js` / `scrollcraft.css`): scroll ilerlemesi, pin, cue, reveal, parallax, count. **Engine dosyalarını düzenleme**; sayfaya özel davranış `main.js` ve `style.css`'te
- **Vanilla JS** (`main.js`): folio, tarayıcı okuması paneli, canlı test, portföy dizini, form
- **Font**: Plus Jakarta Sans, sitede barındırılır (`assets/fonts`, latin + latin-ext); Google Fonts kullanılmaz
- **PHP**: `contact.php` (PHPMailer, Gmail SMTP + mail() yedeği), `check.php` (canlı görünürlük testi)

## Dosya Yapısı

```
erdalbayhan.com/
├── index.html            # EN kaynak (/)
├── tr/index.html         # TR, tools/build-i18n.py üretir; elle düzenleme
├── scrollcraft.css/.js   # engine, dokunma
├── style.css             # sayfa tasarımı (tokenlar + bölümler)
├── main.js               # sayfa davranışı
├── check.php             # görünürlük testi (robots.txt, sitemap, llms.txt, meta, JSON-LD, hreflang)
├── contact.php           # form → Gmail (config.php sunucuda, git'te değil)
├── tools/build-i18n.py   # TR sayfa + JSON-LD + sitemap üretici
├── assets/images/        # portfolio-N-M.webp (1600), md/ (800, kartlar), sm/ (440)
└── llms.txt, llms-full.txt, robots.txt, sitemap.xml, 404.html
```

## Design System

Altı renk rolü, tek aksan (kobalt). Bölümler gece ve kâğıt zemin arasında sert kesimle geçer; aksanın iki açıklığı var (aynı ton).

```css
--sc-canvas: #0D0F1A;  --sc-surface: #151827;  /* gece zemin, yüzey */
--sc-ink: #EEF0F7;     --sc-ink-soft: #A2A8C4; /* yazı, ikincil yazı */
--sc-accent: #7D9CFF;  /* gecede aksan */
--paper: #ECEEF4; --paper-ink: #121526; --paper-soft: #4A5070; --paper-accent: #2B4CC2;
```

- Tipografi, boşluk, gölge ve hareket tokenları `scrollcraft.css`'ten gelir (`--sc-t-*`, `--sc-1…11`, `--sc-e1/2/3`, `--sc-ease-out`)
- Yasaklar (scroll-craft taste floor): gradient yazı, görünen metinde em dash (—), her bölümde eyebrow, scroll ipucu, aynı kart ızgarası, uydurma rakam, `transition: all`

## Bölüm Yapısı (Anchor URL'leri)

| # | id | Bölüm | His |
|---|-----|-------|-----|
| 0 | `#hero` | Başlık sayfası (sadece tipografi, katmanlı) | sakin güven |
| 1 | `#gorunmez` | Görünmez: gerçek robots.txt örneği | huzursuzluk |
| 2 | (ara) | Tek satır, bilerek boş | merak |
| 3 | `#test` | Tarayıcı gibi okumak: canlı test (tepe noktası, pinli) | tanıma |
| 4 | `#hizmetler` | Yöntem: Bulunmak / Kazanmak / Kurmak | rahatlama |
| 5 | `#portfolyo` | İşler: 11 site dizini + görsel sütunu | güven |
| 6 | `#sss` | Sorular (FAQPage) | netlik |
| 7 | `#iletisim` | Künye ve form (pinli kapanış) | çözüm |

## Hizmetler (8 kalem, 3 fiil)

- **Bulunmak:** SEO, GEO ve AI Search stratejisi (teknik kontrol listesiyle) · Dijital görünürlük
- **Kazanmak:** Dijital rekabet (Google Ads, Meta) · Dijital strateji · Dijital varlıklar
- **Kurmak:** Tasarım ve geliştirme · Marka kimliği · Dijital fikirler ve projeler

## Animasyon Kuralları

- Scroll davranışları engine attribute'larıyla: `data-sc-act` (flow / pin), `data-sc-cue`, `data-sc-reveal`, `data-sc-parallax`, `data-sc-count`, `data-sc-in`
- İmza hareketi: `#test` pinliyken scroll, paneldeki satırları tarayıcı gibi sırayla "okur" (`--sc-p` → `main.js`)
- Pinli bir ara bölümün son cue'su 1'de biten iki değerli pencereyle kapanır; sadece son bölüm (künye) tutar
- Sadece `transform` / `opacity`; `prefers-reduced-motion` içerikten bir şey saklamaz
- Doğrulama: scroll-craft `shoot.mjs` (masaüstü, 390×844, 360×640, reduced motion) ve Lighthouse mobil ≥ 95

## Çoklu Dil (i18n)

- İki ayrı adres: `/` = EN (kaynak `index.html`), `/tr/` = TR (`tr/index.html`, **üretilir — elle düzenleme**)
- `index.html`'de her metin `data-tr` / `data-en` taşır; görünen metin EN yazılır
- `tools/build-i18n.py` TR sayfayı, her iki sayfanın JSON-LD'sini ve `sitemap.xml`'i üretir;
  `.githooks/pre-commit` index.html commit'lenince otomatik çalıştırır
  (yeni klonda bir kez: `git config core.hooksPath .githooks`)
- Yeni öznitelik metni (aria-label, alt) eklenirse TR karşılığı `ATTR_TR` listesine eklenir
- Her iki sayfada `hreflang` (en / tr / x-default); TR/EN butonu diğer adrese giden bağlantıdır
- Tercih `localStorage` (`eb-lang`) ile hatırlanır; tercih yoksa Türkçe tarayıcı `/`'den `/tr/`'ye yönlenir

## SEO & Meta

- Başlık, açıklama, OG/Twitter, canonical ve hreflang her dil için statik; TR değerleri `build-i18n.py` içindeki `META`'da
- `canonical`: `https://www.erdalbayhan.com/` ve `/tr/`
- Structured Data (JSON-LD `@graph`): Organization + ProfessionalService, Person, WebSite, WebPage, portföy ItemList, FAQPage. Sayfa metninden üretilir, elle yazılmaz
- llms.txt / llms-full.txt / robots.txt (AI tarayıcılarına açık) / sitemap.xml / IndexNow

## Erişilebilirlik

- Semantic HTML (`<nav>`, `<main>`, `<section>`, `<article>`)
- `aria-label` navigasyon öğelerinde
- Renk kontrastı WCAG AA minimum
- Klavye navigasyonu çalışır
- `prefers-reduced-motion` dikkate alınır

## Portföy Kartları

- `#portfolyo` içindeki `<ol class="index">`: her site bir `li.entry` (ad, data-tr/data-en açıklama, link, md görsel). Statik HTML, JS'le üretilmez (AI tarayıcıları okusun)
- Yeni site: 3 ekran görüntüsü → `portfolio-N-{1,2,3}.webp` + `md/` (800, q72) + `sm/` (440, q42); entry'deki `width`/`height` görselin gerçek boyutu olmalı
- Masaüstünde sağdaki görsel sütunu üzerine gelinen / ekranın ortasındaki siteyi gösterir

## İletişim Formu

- **Backend:** `contact.php` — PHPMailer + Gmail SMTP
- **Akış:** HTML form (AJAX/fetch) → `contact.php` → Gmail → gelen kutusu
- **Alanlar:** Ad/Name · E-posta/Email · Mesaj/Message
- **Gönderim:** JS `fetch()` ile async, sayfa yenilenmez; başarı/hata mesajı inline gösterilir
- **Güvenlik:** CSRF token yok (statik site, basit honeypot alanı yeterli) · `htmlspecialchars` ile input temizlenir · rate limiting Hostinger tarafında

### Gmail SMTP Yapılandırması (`contact.php` içinde)

```php
// Gerçek değerler Hostinger'daki config.php veya doğrudan atanır
SMTP Host    : smtp.gmail.com
SMTP Port    : 587 (TLS/STARTTLS)
SMTP User    : erdalbayhan@gmail.com
SMTP Pass    : [Gmail Uygulama Şifresi — 16 karakter]   // Gmail hesabında 2FA açık olmalı
From         : erdalbayhan@gmail.com
To           : erdalbayhan@gmail.com
```

> **Kurulum notu:** Gmail hesabında 2 Adımlı Doğrulama açık olmalı.  
> Ardından Google Hesabı → Güvenlik → "Uygulama Şifreleri" bölümünden  
> "Posta / Diğer" için 16 haneli şifre oluşturulur. Bu şifre sunucudaki `config.php`'ye yazılır.  
> `config.php` git'te değil (repo herkese açık); Gmail reddederse `contact.php` mail() ile dener ve hatayı `logs/` altına yazar.

## Geliştirme Notları

- Build yok, dosyalar doğrudan Hostinger File Manager veya FTP ile yüklenir
- Tüm asset'ler kökten mutlak path ile referans verilir (`/assets/...`) — `/tr/` altında da çalışsın diye
- JS `defer` attribute ile yüklenir
- CSS önce, JS sonra (body kapanmadan önce)
- `console.log` production'da bırakılmaz

## Konvansiyonlar

- CSS sınıfları: kebab-case (`hero-title`, `card-overlay`)
- JS fonksiyonlar: camelCase (`initScrollReveal`, `toggleLanguage`)
- ID'ler: kebab-case, Türkçe karakter kullanılmaz (`hakkimda`, `portfolyo`)
- Görsel formatı: WebP (JPEG fallback)
