# erdalbayhan.com — Proje Rehberi

## Proje Özeti

Kişisel/profesyonel portföy ve hizmet tanıtım sitesi.  
Tek sayfalık (single-page scroll), statik, mobil öncelikli.  
Hostinger'da barındırılır — build adımı yoktur.

## Tech Stack

- **HTML5** — semantik yapı, tek `index.html`
- **CSS3** — custom properties, Flexbox/Grid, animasyonlar
- **Vanilla JS** — sıfır framework, sıfır bundler
- **Typed.js** (CDN) — hero yazı animasyonu
- **Google Fonts** (CDN) — Plus Jakarta Sans
- **PHPMailer** (Composer veya tek dosya) — Gmail SMTP ile mail gönderimi

## Dosya Yapısı

```
erdalbayhan.com/
├── index.html
├── style.css
├── main.js
├── contact.php           # Gmail SMTP mail gönderici (PHPMailer)
├── assets/
│   ├── images/          # Portföy ekran görüntüleri (portfolio-1.webp …)
│   ├── og-image.jpg     # Open Graph görseli
│   └── favicon.ico
└── CLAUDE.md
```

## Design System

### Renkler

```css
--bg-primary:    #0D0F1A;   /* Ana zemin */
--bg-card:       #1A1D2E;   /* Kart yüzeyi */
--accent-main:   #FF6B2B;   /* Turuncu — ana aksan */
--accent-amber:  #FFB347;   /* Amber — ikincil */
--accent-coral:  #FF4757;   /* Mercan — üçüncül / hover */
--text-primary:  #F0F0F5;   /* Ana yazı */
--text-muted:    #8B8FA8;   /* Soluk yazı */
--gradient-main: linear-gradient(135deg, #FF6B2B, #FFB347);
--gradient-alt:  linear-gradient(135deg, #FF6B2B, #FF4757);
```

### Tipografi

```css
font-family: 'Plus Jakarta Sans', sans-serif;
--fs-hero:   clamp(2.5rem, 6vw, 5rem);
--fs-h2:     clamp(1.75rem, 4vw, 3rem);
--fs-h3:     clamp(1.25rem, 2.5vw, 1.75rem);
--fs-body:   1rem;          /* 16px */
--fs-small:  0.875rem;      /* 14px */
```

### Spacing

```
4px / 8px / 16px / 24px / 32px / 48px / 64px / 96px
```

### Border Radius

```
--radius-sm: 8px;
--radius-md: 16px;
--radius-lg: 24px;
--radius-pill: 999px;
```

## Bölüm Yapısı (Anchor URL'leri)

| # | id | TR Başlık | EN Başlık |
|---|-----|-----------|-----------|
| 1 | `#hero` | — | — |
| 2 | `#hakkimda` | Hakkımda | About |
| 3 | `#hizmetler` | Hizmetler | Services |
| 4 | `#portfolyo` | Portföy | Portfolio |
| 5 | `#iletisim` | İletişim | Contact |

## Hizmetler (7 adet)

1. Web Tasarımı / Web Design
2. Web Geliştirme / Web Development
3. Marka Kimliği & Logo / Brand Identity & Logo
4. Dijital Projeler / Digital Projects
5. SEO
6. GEO
7. SEM

## Animasyon Kuralları

- **Scroll animasyonları:** `IntersectionObserver` ile `.reveal` class toggle — CSS transition
- **Hero yazı:** `Typed.js` ile meslekler arasında geçiş
- **Arka plan:** CSS animated gradient blob (pure CSS, JS yok)
- **Hover efektleri:** Pure CSS transform + box-shadow
- **Portföy kartları:** Hover'da 3D tilt (`mousemove` JS) + screenshot geçiş overlay
- **Performans:** `will-change` sadece aktif animasyonlarda, `prefers-reduced-motion` desteklenir

## Çoklu Dil (i18n)

- `data-tr` ve `data-en` attribute'ları ile tüm metinler HTML'de ikili tutulur
- JS ile `<html lang="...">` ve görünürlük toggle edilir
- Aktif dil `localStorage`'da saklanır
- Tarayıcı dili otomatik algılanır (varsayılan: TR)

## SEO & Meta

- `<title>`, `<meta description>` her dil için JS ile güncellenir
- Open Graph etiketleri statik (TR)
- `canonical` tag: `https://erdalbayhan.com`
- Structured Data: `Person` schema (JSON-LD)

## Erişilebilirlik

- Semantic HTML (`<nav>`, `<main>`, `<section>`, `<article>`)
- `aria-label` navigasyon öğelerinde
- Renk kontrastı WCAG AA minimum
- Klavye navigasyonu çalışır
- `prefers-reduced-motion` dikkate alınır

## Portföy Kartları

- 6 kart, her biri: proje adı, kısa açıklama, teknoloji etiketleri, ekran görüntüsü, dış link
- Görsel: `/assets/images/portfolio-{1-6}.webp` (optimize edilmiş, max 800×500)
- Hover: 3D tilt + "Siteyi Gör / View Site" overlay

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
> "Posta / Diğer" için 16 haneli şifre oluşturulur. Bu şifre `contact.php`'ye yazılır.  
> Şifreyi asla versiyona (git) commit etme — `.gitignore`'a ekle veya ayrı `config.php` kullan.

## Geliştirme Notları

- Build yok, dosyalar doğrudan Hostinger File Manager veya FTP ile yüklenir
- Tüm asset'ler relatif path ile referans verilir
- JS `defer` attribute ile yüklenir
- CSS önce, JS sonra (body kapanmadan önce)
- `console.log` production'da bırakılmaz

## Konvansiyonlar

- CSS sınıfları: kebab-case (`hero-title`, `card-overlay`)
- JS fonksiyonlar: camelCase (`initScrollReveal`, `toggleLanguage`)
- ID'ler: kebab-case, Türkçe karakter kullanılmaz (`hakkimda`, `portfolyo`)
- Görsel formatı: WebP (JPEG fallback)
