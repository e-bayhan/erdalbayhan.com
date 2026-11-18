<?php
/* ════════════════════════════════════════════
   Görünürlük testi — bir alan adının arama motorları ve AI tarayıcıları
   tarafından okunup okunamadığını kontrol eder.
   Güvenlik: sadece genel internet adresleri (iç ağ yok, DNS sabitlenir),
   kısa zaman aşımı, boyut sınırı, IP başına sınır, alan adı başına önbellek.
════════════════════════════════════════════ */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex');

const UA          = 'OnDutyMastersVisibilityCheck/1.0 (+https://www.erdalbayhan.com/)';
const MAX_BYTES   = 400000;
const MAX_HOPS    = 3;
const RATE_LIMIT  = 8;      // istek
const RATE_WINDOW = 600;    // saniye
const CACHE_TTL   = 900;    // saniye

/* AI ve arama tarayıcıları: robots.txt'deki adları */
const CRAWLERS = [
    ['token' => 'GPTBot',          'label' => 'ChatGPT (OpenAI)'],
    ['token' => 'OAI-SearchBot',   'label' => 'ChatGPT search'],
    ['token' => 'ClaudeBot',       'label' => 'Claude (Anthropic)'],
    ['token' => 'PerplexityBot',   'label' => 'Perplexity'],
    ['token' => 'Google-Extended', 'label' => 'Gemini (Google)'],
    ['token' => 'Bingbot',         'label' => 'Bing and Copilot'],
];

function respond(int $status, array $body): void
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function storeDir(): string
{
    $dir = sys_get_temp_dir() . '/odm-check';
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    return $dir;
}

/* ── Girdi: alan adı ── */
$raw = strtolower(trim((string) ($_POST['domain'] ?? $_GET['domain'] ?? '')));
$raw = preg_replace('#^[a-z][a-z0-9+.-]*://#', '', $raw);
$host = rtrim(explode('/', explode('?', $raw)[0])[0], '.');
$host = preg_replace('/:\d+$/', '', $host);
if (function_exists('idn_to_ascii') && preg_match('/[^\x20-\x7e]/', $host)) {
    $host = (string) idn_to_ascii($host, IDNA_DEFAULT, INTL_IDNA_VARIANT_UTS46);
}
if (!preg_match('/^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/', $host)) {
    respond(400, ['ok' => false, 'error' => 'invalid_domain']);
}

/* ── IP başına sınır ── */
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rateFile = storeDir() . '/rate-' . md5($ip);
$now = time();
$hits = array_filter(
    array_map('intval', is_file($rateFile) ? (array) file($rateFile, FILE_IGNORE_NEW_LINES) : []),
    fn($t) => $t > $now - RATE_WINDOW
);
if (count($hits) >= RATE_LIMIT) {
    respond(429, ['ok' => false, 'error' => 'rate_limited']);
}
$hits[] = $now;
@file_put_contents($rateFile, implode("\n", $hits), LOCK_EX);

/* ── Önbellek ── */
$cacheFile = storeDir() . '/cache-' . md5($host) . '.json';
if (is_file($cacheFile) && filemtime($cacheFile) > $now - CACHE_TTL) {
    echo file_get_contents($cacheFile);
    exit;
}

/* ── Güvenli çekme: her adımda adresi doğrula, DNS'i sabitle ── */
function publicIp(string $host): ?string
{
    $ips = gethostbynamel($host) ?: [];
    if (!$ips) {
        return null;
    }
    foreach ($ips as $candidate) {
        if (!filter_var($candidate, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
            return null; // bir tanesi bile iç ağa çıkıyorsa reddet
        }
    }
    return $ips[0];
}

function fetchUrl(string $url): array
{
    for ($hop = 0; $hop <= MAX_HOPS; $hop++) {
        $parts = parse_url($url);
        $scheme = $parts['scheme'] ?? '';
        $host = strtolower($parts['host'] ?? '');
        if (!in_array($scheme, ['http', 'https'], true) || $host === '' || isset($parts['port'])) {
            return ['status' => 0, 'body' => '', 'url' => $url, 'error' => 'blocked_url'];
        }
        $ip = publicIp($host);
        if ($ip === null) {
            return ['status' => 0, 'body' => '', 'url' => $url, 'error' => 'unresolved'];
        }

        $body = '';
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RESOLVE        => [$host . ':' . ($scheme === 'https' ? 443 : 80) . ':' . $ip],
            CURLOPT_PROTOCOLS      => CURLPROTO_HTTP | CURLPROTO_HTTPS,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_CONNECTTIMEOUT => 3,
            CURLOPT_TIMEOUT        => 6,
            CURLOPT_USERAGENT      => UA,
            CURLOPT_HTTPHEADER     => ['Accept: text/html,text/plain,application/xml;q=0.9,*/*;q=0.5'],
            CURLOPT_ENCODING       => '',
            CURLOPT_HEADER         => false,
            CURLOPT_WRITEFUNCTION  => function ($ch, $chunk) use (&$body) {
                $body .= $chunk;
                return strlen($body) > MAX_BYTES ? 0 : strlen($chunk);
            },
        ]);
        curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        $type = (string) curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
        $location = (string) curl_getinfo($ch, CURLINFO_REDIRECT_URL);

        if ($status >= 300 && $status < 400 && $location !== '') {
            $url = $location;
            continue;
        }
        return ['status' => $status, 'body' => $body, 'type' => $type, 'url' => $url];
    }
    return ['status' => 0, 'body' => '', 'url' => $url, 'error' => 'too_many_redirects'];
}

/* ── robots.txt: kök adres ("/") her tarayıcı için açık mı? ── */
function robotsGroups(string $txt): array
{
    $groups = [];
    $agents = [];
    $lastWasAgent = false;
    foreach (preg_split('/\r\n|\r|\n/', $txt) as $line) {
        $line = trim(preg_replace('/#.*/', '', $line));
        if (!preg_match('/^([a-z-]+)\s*:\s*(.*)$/i', $line, $m)) {
            continue;
        }
        $field = strtolower($m[1]);
        $value = trim($m[2]);
        if ($field === 'user-agent') {
            if (!$lastWasAgent) {
                $agents = [];
            }
            $agents[] = strtolower($value);
            foreach ($agents as $a) {
                $groups[$a] = $groups[$a] ?? [];
            }
            $lastWasAgent = true;
        } elseif ($field === 'allow' || $field === 'disallow') {
            foreach ($agents as $a) {
                $groups[$a][] = [$field, $value];
            }
            $lastWasAgent = false;
        } else {
            $lastWasAgent = false;
        }
    }
    return $groups;
}

function rootAllowed(array $rules): bool
{
    $best = -1;
    $allowed = true;
    foreach ($rules as [$kind, $pattern]) {
        if ($pattern === '') {
            continue; // "Disallow:" boş = izin
        }
        $regex = '#^' . str_replace(['\*', '\$'], ['.*', '$'], preg_quote($pattern, '#')) . '#';
        if (!preg_match($regex, '/')) {
            continue;
        }
        $len = strlen($pattern);
        if ($len > $best || ($len === $best && $kind === 'allow')) {
            $best = $len;
            $allowed = $kind === 'allow';
        }
    }
    return $allowed;
}

function metaContent(string $html, string $attr, string $name): string
{
    if (preg_match('#<meta\b[^>]*\b' . $attr . '\s*=\s*["\']' . preg_quote($name, '#') . '["\'][^>]*>#i', $html, $m)
        && preg_match('#\bcontent\s*=\s*["\']([^"\']*)["\']#i', $m[0], $c)) {
        return html_entity_decode(trim($c[1]), ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }
    return '';
}

/* ── Kontroller ── */
$base = 'https://' . $host;
$home = fetchUrl($base . '/');
if ($home['status'] === 0 || $home['status'] >= 500) {
    $home = fetchUrl('http://' . $host . '/');
}
if ($home['status'] === 0) {
    respond(200, ['ok' => false, 'error' => 'unreachable', 'domain' => $host]);
}
$origin = preg_replace('#^(https?://[^/]+).*$#', '$1', $home['url']);

$robots = fetchUrl($origin . '/robots.txt');
$robotsFound = $robots['status'] === 200 && stripos(ltrim($robots['body']), '<') !== 0;
$robotsKnown = $robotsFound || ($robots['status'] >= 400 && $robots['status'] < 500);
$groups = $robotsFound ? robotsGroups($robots['body']) : [];

$crawlers = [];
foreach (CRAWLERS as $c) {
    $key = strtolower($c['token']);
    $rules = $groups[$key] ?? ($groups['*'] ?? []);
    $status = !$robotsKnown ? 'unknown' : (rootAllowed($rules) ? 'allowed' : 'blocked');
    $crawlers[] = [
        'token'  => $c['token'],
        'label'  => $c['label'],
        'status' => $status,
        'rule'   => isset($groups[$key]) ? 'named' : (isset($groups['*']) ? 'wildcard' : 'none'),
    ];
}

$sitemaps = [];
if ($robotsFound && preg_match_all('/^\s*sitemap\s*:\s*(\S+)/im', $robots['body'], $sm)) {
    $sitemaps = $sm[1];
}
$sitemapUrl = $sitemaps[0] ?? $origin . '/sitemap.xml';
$sitemap = fetchUrl($sitemapUrl);
$sitemapFound = $sitemap['status'] === 200 && preg_match('/<(urlset|sitemapindex)\b/i', $sitemap['body']);

$llms = fetchUrl($origin . '/llms.txt');
$llmsFound = $llms['status'] === 200 && stripos(ltrim($llms['body']), '<') !== 0 && trim($llms['body']) !== '';

$html = $home['status'] === 200 ? $home['body'] : '';
$title = preg_match('#<title[^>]*>(.*?)</title>#is', $html, $t)
    ? html_entity_decode(trim(preg_replace('/\s+/', ' ', strip_tags($t[1]))), ENT_QUOTES | ENT_HTML5, 'UTF-8')
    : '';

$result = [
    'ok'          => true,
    'domain'      => $host,
    'checkedAt'   => gmdate('c'),
    'robots'      => ['found' => $robotsFound, 'status' => $robots['status']],
    /* Ana sayfa okunamadıysa (ör. 403 bot koruması) sayfa kontrolleri "bilinmiyor" sayılır */
    'page'        => ['status' => $home['status'], 'read' => $html !== ''],
    'crawlers'    => $crawlers,
    'llms'        => ['found' => (bool) $llmsFound],
    'sitemap'     => ['found' => (bool) $sitemapFound, 'fromRobots' => (bool) $sitemaps],
    'title'       => mb_substr($title, 0, 120),
    'description' => mb_substr(metaContent($html, 'name', 'description'), 0, 200),
    'preview'     => [
        'title' => metaContent($html, 'property', 'og:title') !== '',
        'image' => metaContent($html, 'property', 'og:image') !== '',
    ],
    'structured'  => preg_match_all('#<script[^>]+type\s*=\s*["\']application/ld\+json["\']#i', $html),
    'hreflang'    => preg_match_all('#<link\b[^>]*\bhreflang\s*=#i', $html),
];

$json = json_encode($result, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
@file_put_contents($cacheFile, $json, LOCK_EX);
echo $json;
