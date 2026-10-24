#!/usr/bin/env python3
"""
erdalbayhan.com — iki dilli sayfa üretici.

Kaynak: index.html (EN, kökte yayınlanır). Her metin öğesi data-tr / data-en taşır.
Üretilenler:
  - tr/index.html   : aynı sayfanın TR sürümü (/tr/)
  - index.html      : JSON-LD bloğu sayfa metninden yeniden yazılır (EN)
  - sitemap.xml     : iki dil + hreflang alternatifleri

Elle çalıştırma:  python3 tools/build-i18n.py
Otomatik:         .githooks/pre-commit (git config core.hooksPath .githooks)
"""
import datetime
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'index.html'
TR_OUT = ROOT / 'tr' / 'index.html'
SITEMAP = ROOT / 'sitemap.xml'
BASE = 'https://www.erdalbayhan.com/'
URLS = {'en': BASE, 'tr': BASE + 'tr/'}

META = {
    'en': {
        'title': 'On-Duty Masters — Seasoned Digital Agency',
        'description': 'We help brands master their digital presence, manage their digital assets, and win the digital competition. Design and develop new ideas, create brand identity, manage projects that will grow your business.',
        'social': 'SEO & GEO & AI Search strategy, web design and development, brand identity and digital projects that grow your business.',
        'image_alt': 'On-Duty Masters — "Seasoned" SEO & GEO & AI Search Strategy Hackers',
        'locale': 'en_US',
        'locale_alt': 'tr_TR',
        'org_description': 'We help brands master their digital presence, manage their digital assets, and win the digital competition — with end-to-end SEO & GEO & AI Search strategy, web design and development, brand identity and digital project management.',
        'services': 'Services',
        'portfolio': 'Portfolio',
    },
    'tr': {
        'title': 'On-Duty Masters — Tecrübeli Dijital Ajans',
        'description': 'Markanızın dijital görünürlüğünü güçlendiriyor, dijital varlıklarını yönetiyor ve dijital rekabette öne çıkmasını sağlıyoruz. Yeni fikirleri tasarlıyor, marka kimliği oluşturuyor, işinizi büyütecek projeleri yönetiyoruz.',
        'social': 'SEO, GEO ve AI Search stratejisi, web tasarımı ve geliştirme, marka kimliği ve işinizi büyütecek dijital projeler.',
        'image_alt': 'On-Duty Masters — "Tecrübeli" SEO, GEO ve AI Search strateji ajansı',
        'locale': 'tr_TR',
        'locale_alt': 'en_US',
        'org_description': 'Markaların dijital görünürlüğünü güçlendiriyor, dijital varlıklarını yönetiyor ve dijital rekabette öne çıkmalarını sağlıyoruz: uçtan uca SEO, GEO ve AI Search stratejisi, web tasarımı ve geliştirme, marka kimliği ve dijital proje yönetimi.',
        'services': 'Hizmetler',
        'portfolio': 'Portföy',
    },
}

# EN kaynaktaki öznitelik metinleri → TR
ATTR_TR = [
    ('aria-label="Main menu"', 'aria-label="Ana menü"'),
    ('aria-label="Menu"', 'aria-label="Menü"'),
    ('aria-label="Close menu"', 'aria-label="Menüyü kapat"'),
    ('aria-label="Intro"', 'aria-label="Giriş"'),
    ('aria-label="On-Duty Masters — Home"', 'aria-label="On-Duty Masters — Ana Sayfa"'),
    ('aria-label="On-Duty Masters — Back to top"', 'aria-label="On-Duty Masters — Sayfa Başı"'),
    ('alt="SaasMetre — Home page"', 'alt="SaasMetre — Ana sayfa"'),
    ('alt="SaasMetre — Tool finder"', 'alt="SaasMetre — Araç bulma"'),
    ('alt="SaasMetre — Comparison"', 'alt="SaasMetre — Karşılaştırma"'),
]

LANG_LINK = {
    'en': '<a class="lang-btn" id="lang-btn" href="/tr/" hreflang="tr" aria-label="Türkçe sürüm / Turkish version">',
    'tr': '<a class="lang-btn" id="lang-btn" href="/" hreflang="en" aria-label="English version / İngilizce sürüm">',
}

REDIRECT_EN = """      var wantsTr = pref ? pref === 'tr' : /^tr\\b/i.test(navigator.language || '');
      if (wantsTr) location.replace('/tr/' + location.search + location.hash);"""
REDIRECT_TR = """      if (pref === 'en') location.replace('/' + location.search + location.hash);"""


def unesc(s):
    return html.unescape(s).strip()


def esc_attr(s):
    return html.escape(s, quote=True)


def section(t, start, end):
    s = t.index(start)
    return t[s:t.index(end, s)]


def replace_once(t, old, new, label):
    if old not in t:
        sys.exit(f'build-i18n: "{label}" kaynakta bulunamadı — index.html yapısı değişmiş olabilir')
    return t.replace(old, new, 1)


def extract(t):
    """Sayfadaki hizmet, portföy ve SSS metinlerini (tr, en) çiftleri olarak çıkar."""
    svc = re.findall(r'<h3 data-tr="(.*?)" data-en="(.*?)">.*?<p data-tr="(.*?)"\s+data-en="(.*?)"',
                     section(t, 'id="hizmetler"', 'id="portfolyo"'), re.S)
    port = re.findall(r'<h3>(.*?)</h3>\s*<p data-tr="(.*?)"\s+data-en="(.*?)">.*?href="(http[^"]+)"',
                      section(t, 'id="portfolyo"', 'id="sss"'), re.S)
    faq = re.findall(r'<summary data-tr="(.*?)"\s+data-en="(.*?)">.*?<p data-tr="(.*?)"\s+data-en="(.*?)"',
                     section(t, 'id="sss"', 'id="iletisim"'), re.S)
    return svc, port, faq


def json_ld(t, lang):
    i = 0 if lang == 'tr' else 1
    m = META[lang]
    url = URLS[lang]
    org, per, site = BASE + '#organization', BASE + '#erdal-bayhan', BASE + '#website'
    svc, port, faq = extract(t)
    graph = [
        {
            '@type': ['Organization', 'ProfessionalService'], '@id': org,
            'name': 'On-Duty Masters', 'alternateName': 'Seasoned', 'url': BASE,
            'logo': {'@type': 'ImageObject', 'url': BASE + 'assets/logo.svg'},
            'image': BASE + 'assets/og-image.jpg',
            'description': m['org_description'],
            'email': 'erdalbayhan@gmail.com', 'founder': {'@id': per},
            'address': {'@type': 'PostalAddress', 'addressLocality': 'Istanbul', 'addressCountry': 'TR'},
            'areaServed': [{'@type': 'Country', 'name': 'Turkey'}, 'Worldwide'],
            'knowsLanguage': ['tr', 'en'],
            'knowsAbout': ['SEO', 'Generative Engine Optimization (GEO)', 'AI Search', 'Web Design',
                           'Web Development', 'Brand Identity', 'Digital Strategy', 'Google Ads',
                           'Meta Ads', 'Social Media Management'],
            'hasOfferCatalog': {
                '@type': 'OfferCatalog', 'name': m['services'],
                'itemListElement': [
                    {'@type': 'Offer', 'itemOffered': {'@type': 'Service', 'name': unesc(s[i]),
                                                       'description': unesc(s[2 + i]), 'provider': {'@id': org}}}
                    for s in svc],
            },
            'contactPoint': {'@type': 'ContactPoint', 'contactType': 'sales', 'email': 'erdalbayhan@gmail.com',
                             'url': url + '#iletisim', 'availableLanguage': ['Turkish', 'English']},
        },
        {
            '@type': 'Person', '@id': per, 'name': 'Erdal Bayhan', 'url': BASE,
            'jobTitle': 'Founder, Digital Strategist & Web Developer',
            'worksFor': {'@id': org}, 'sameAs': ['https://www.linkedin.com/in/erdalbayhan/'],
        },
        {'@type': 'WebSite', '@id': site, 'url': BASE, 'name': 'On-Duty Masters',
         'publisher': {'@id': org}, 'inLanguage': ['en', 'tr']},
        {'@type': 'WebPage', '@id': url + '#webpage', 'url': url, 'name': m['title'],
         'description': m['description'], 'inLanguage': lang,
         'isPartOf': {'@id': site}, 'about': {'@id': org}},
        {
            '@type': 'ItemList', '@id': url + '#portfolio', 'name': m['portfolio'],
            'itemListElement': [
                {'@type': 'ListItem', 'position': n + 1,
                 'item': {'@type': 'WebSite', 'name': unesc(name), 'url': link,
                          'description': unesc(en if lang == 'en' else tr), 'creator': {'@id': org}}}
                for n, (name, tr, en, link) in enumerate(port)],
        },
        {
            '@type': 'FAQPage', '@id': url + '#faq',
            'mainEntity': [
                {'@type': 'Question', 'name': unesc(f[i]),
                 'acceptedAnswer': {'@type': 'Answer', 'text': unesc(f[2 + i])}}
                for f in faq],
        },
    ]
    body = json.dumps({'@context': 'https://schema.org', '@graph': graph}, ensure_ascii=False, indent=2)
    body = '\n'.join('  ' + line for line in body.splitlines())
    return '<script type="application/ld+json">\n' + body + '\n  </script>'


def set_json_ld(t, block):
    t, n = re.subn(r'<script type="application/ld\+json">.*?</script>', lambda _: block, t, count=1, flags=re.S)
    if n != 1:
        sys.exit('build-i18n: JSON-LD bloğu bulunamadı')
    return t


def to_turkish(t):
    m, en = META['tr'], META['en']

    # <html lang>, başlık ve meta
    t = replace_once(t, '<html lang="en">', '<html lang="tr">', 'html lang')
    t = replace_once(t, f'<title>{esc_attr(en["title"])}</title>', f'<title>{esc_attr(m["title"])}</title>', 'title')
    t = replace_once(t, f'<meta name="description" content="{esc_attr(en["description"])}" />',
                     f'<meta name="description" content="{esc_attr(m["description"])}" />', 'meta description')
    t = replace_once(t, f'<link rel="canonical" href="{URLS["en"]}" />',
                     f'<link rel="canonical" href="{URLS["tr"]}" />', 'canonical')
    t = replace_once(t, f'<meta property="og:url" content="{URLS["en"]}" />',
                     f'<meta property="og:url" content="{URLS["tr"]}" />', 'og:url')
    for prop in ('og:title', 'twitter:title'):
        attr = 'property' if prop.startswith('og') else 'name'
        t = replace_once(t, f'<meta {attr}="{prop}" content="{esc_attr(en["title"])}" />',
                         f'<meta {attr}="{prop}" content="{esc_attr(m["title"])}" />', prop)
    for prop in ('og:description', 'twitter:description'):
        attr = 'property' if prop.startswith('og') else 'name'
        t = replace_once(t, f'<meta {attr}="{prop}" content="{esc_attr(en["social"])}" />',
                         f'<meta {attr}="{prop}" content="{esc_attr(m["social"])}" />', prop)
    t = replace_once(t, f'<meta property="og:image:alt" content="{esc_attr(en["image_alt"])}" />',
                     f'<meta property="og:image:alt" content="{esc_attr(m["image_alt"])}" />', 'og:image:alt')
    t = replace_once(t, '<meta property="og:locale" content="en_US" />\n  <meta property="og:locale:alternate" content="tr_TR" />',
                     '<meta property="og:locale" content="tr_TR" />\n  <meta property="og:locale:alternate" content="en_US" />', 'og:locale')

    # Dil tercihi yönlendirmesi ve dil bağlantısı
    t = replace_once(t, REDIRECT_EN, REDIRECT_TR, 'dil yönlendirmesi')
    t = replace_once(t, LANG_LINK['en'], LANG_LINK['tr'], 'dil bağlantısı')

    # Metin öğeleri: içerik data-en ile aynıysa data-tr ile değiştir
    def swap(mm):
        open_tag, tr, en_txt, inner, close = mm.group(1), mm.group(3), mm.group(4), mm.group(5), mm.group(6)
        if unesc(inner) != unesc(en_txt):
            return mm.group(0)
        lead = re.match(r'\s*', inner).group(0)
        trail = re.search(r'\s*$', inner).group(0)
        return open_tag + lead + tr + trail + close

    t = re.sub(r'(<(\w+)\b[^>]*?\bdata-tr="([^"]*)"[^>]*?\bdata-en="([^"]*)"[^>]*>)([^<]*)(</\2>)', swap, t, flags=re.S)

    # Form placeholder'ları
    t = re.sub(r'(data-placeholder-tr="([^"]*)"\s+data-placeholder-en="[^"]*"\s*placeholder=")[^"]*(")',
               r'\1\2\3', t)

    # Öznitelik metinleri
    for a, b in ATTR_TR:
        t = t.replace(a, b)
    t = re.sub(r' — screenshot (\d)"', r' — görsel \1"', t)
    return t


def leftover_english(t):
    """TR sayfada hâlâ EN içeriği kalan data-tr öğeleri (kaynakta elle düzeltilmeli)."""
    return [m.group(1)[:80] for m in re.finditer(r'(<\w+[^>]*data-tr="([^"]*)"[^>]*data-en="([^"]*)"[^>]*>)\s*([^<]*?)\s*<', t)
            if m.group(2) != m.group(3) and unesc(m.group(4)) == unesc(m.group(3))]


def sitemap(lastmod):
    alts = ''.join(f'\n    <xhtml:link rel="alternate" hreflang="{h}" href="{u}" />'
                   for h, u in (('en', URLS['en']), ('tr', URLS['tr']), ('x-default', URLS['en'])))
    page = lambda u, prio: (f'  <url>\n    <loc>{u}</loc>\n    <lastmod>{lastmod}</lastmod>\n'
                            f'    <changefreq>monthly</changefreq>\n    <priority>{prio}</priority>{alts}\n'
                            f'    <image:image><image:loc>{BASE}assets/og-image.jpg</image:loc></image:image>\n  </url>\n')
    files = ''.join(f'  <url>\n    <loc>{BASE}{f}</loc>\n    <lastmod>{lastmod}</lastmod>\n  </url>\n'
                    for f in ('llms.txt', 'llms-full.txt'))
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n'
            '        xmlns:xhtml="http://www.w3.org/1999/xhtml"\n'
            '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n'
            + page(URLS['en'], '1.0') + page(URLS['tr'], '0.9') + files + '</urlset>\n')


def write_if_changed(path, content):
    old = path.read_text(encoding='utf-8') if path.exists() else None
    if old == content:
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding='utf-8')
    return True


def main():
    src = SRC.read_text(encoding='utf-8')

    en_page = set_json_ld(src, json_ld(src, 'en'))
    tr_page = set_json_ld(to_turkish(en_page), json_ld(src, 'tr'))
    tr_page = tr_page.replace('<!DOCTYPE html>', '<!DOCTYPE html>\n<!-- Bu dosya tools/build-i18n.py ile index.html\'den üretilir; elle düzenleme. -->', 1)

    left = leftover_english(tr_page)
    if left:
        print('build-i18n: uyarı — TR sayfada çevrilmemiş öğeler:', *left, sep='\n  ')

    changed = [str(p.relative_to(ROOT)) for p, c in ((SRC, en_page), (TR_OUT, tr_page)) if write_if_changed(p, c)]
    if changed or not SITEMAP.exists():
        write_if_changed(SITEMAP, sitemap(datetime.date.today().isoformat()))
        changed.append('sitemap.xml')
    print('build-i18n:', ', '.join(changed) + ' güncellendi' if changed else 'değişiklik yok')


if __name__ == '__main__':
    main()
