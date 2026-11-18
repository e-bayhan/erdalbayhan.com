/* ════════════════════════════════════════════
   erdalbayhan.com — main.js
   Page-local behaviour. The engine (scrollcraft.js) stays untouched.
════════════════════════════════════════════ */

const LANG = document.documentElement.lang === 'tr' ? 'tr' : 'en';
const T = (en, tr) => (LANG === 'tr' ? tr : en);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ════════════════════════════════════════════
   LANGUAGE — / is EN, /tr/ is TR (generated); remember the choice
════════════════════════════════════════════ */
function initLangSwitch() {
  document.querySelectorAll('a[hreflang]').forEach(link => {
    link.addEventListener('click', () => {
      try { localStorage.setItem('eb-lang', link.hreflang); } catch (e) {}
      link.href = link.getAttribute('href').split('#')[0] + location.hash;
    });
  });
}

/* ════════════════════════════════════════════
   FOLIO — current chapter in the margin
════════════════════════════════════════════ */
function initFolio() {
  const folio = document.querySelector('.folio');
  const links = folio ? [...folio.querySelectorAll('ol a')] : [];
  const mfolio = document.querySelector('.mfolio');
  const chapters = [...document.querySelectorAll('main > section')];
  let ticking = false;

  const update = () => {
    ticking = false;
    const mid = window.innerHeight * 0.5;
    const current = chapters.find(s => {
      const r = s.getBoundingClientRect();
      return r.top <= mid && r.bottom > mid;
    });
    if (!current) return;

    if (folio) folio.dataset.ground = current.dataset.chapter === 'paper' ? 'paper' : 'night';
    let label = 'On-Duty Masters';
    links.forEach(a => {
      const on = current.id && a.getAttribute('href') === '#' + current.id;
      a.setAttribute('aria-current', on ? 'true' : 'false');
      if (on) label = a.textContent.replace(/^(\d+)/, '$1 ');
    });
    if (mfolio) mfolio.textContent = label;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) { ticking = true; requestAnimationFrame(update); }
  }, { passive: true });
  window.addEventListener('resize', update);
  update();
}

/* ════════════════════════════════════════════
   THE CRAWLER'S READ — audit panel
════════════════════════════════════════════ */
const CRAWLER_TR = {
  'GPTBot': 'ChatGPT (OpenAI)',
  'OAI-SearchBot': 'ChatGPT arama',
  'ClaudeBot': 'Claude (Anthropic)',
  'PerplexityBot': 'Perplexity',
  'Google-Extended': 'Gemini (Google)',
  'Bingbot': 'Bing ve Copilot',
};

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const st = (kind, text, note) => `<span class="st st--${kind}">${esc(text)}${note ? ` <small>${esc(note)}</small>` : ''}</span>`;

function renderPanel(r, { sample }) {
  const $ = id => document.getElementById(id);
  $('panel-domain').textContent = r.domain;
  $('panel-meta').textContent = sample
    ? T('Sample: measured 18 November 2026', 'Örnek: 18 Kasım 2026\'da ölçüldü')
    : T('Checked just now', 'Az önce kontrol edildi');

  $('v-crawlers').innerHTML = r.crawlers.map(c => {
    const name = LANG === 'tr' ? (CRAWLER_TR[c.token] || c.label) : c.label;
    if (c.status === 'allowed') return st('ok', name);
    if (c.status === 'blocked') return st('bad', name, T('blocked', 'engelli'));
    return st('neutral', name, T('unclear', 'belirsiz'));
  }).join('');

  $('v-sitemap').innerHTML = r.sitemap.found
    ? st('ok', T('Found', 'Var'), r.sitemap.fromRobots ? T('listed in robots.txt', 'robots.txt\'de belirtilmiş') : '')
    : st('bad', T('Missing', 'Yok'));

  $('v-llms').innerHTML = r.llms.found
    ? st('ok', T('Found', 'Var'))
    : st('neutral', T('Missing', 'Yok'), T('most sites do not have one yet', 'çoğu sitede henüz yok'));

  const pageRead = !r.page || r.page.read;
  const unread = st('neutral', T(`Home page could not be read (HTTP ${r.page && r.page.status})`, `Ana sayfa okunamadı (HTTP ${r.page && r.page.status})`));

  $('v-title').innerHTML = !pageRead ? unread
    : r.title ? st('ok', `“${r.title}”`) : st('bad', T('Missing', 'Yok'));

  $('v-preview').innerHTML = !pageRead ? unread
    : r.preview.title && r.preview.image ? st('ok', T('Title and image', 'Başlık ve görsel'))
    : r.preview.title ? st('neutral', T('Title, no image', 'Başlık var, görsel yok'))
    : st('bad', T('Missing', 'Yok'));

  $('v-structured').innerHTML = !pageRead ? unread
    : r.structured > 0 ? st('ok', T(`${r.structured} JSON-LD block${r.structured > 1 ? 's' : ''}`, `${r.structured} JSON-LD bloğu`))
    : st('bad', T('None', 'Yok'));

  $('v-hreflang').innerHTML = !pageRead ? unread
    : r.hreflang > 0 ? st('ok', T(`${r.hreflang} language links`, `${r.hreflang} dil bağlantısı`))
    : st('neutral', T('None', 'Yok'), T('fine for a one-language site', 'tek dilli site için sorun değil'));
}

function initCrawlerRead() {
  const act = document.getElementById('test');
  const rows = [...document.querySelectorAll('#panel .row')];
  const sample = JSON.parse(document.getElementById('sample').textContent);
  renderPanel(sample, { sample: true });

  let settled = reduceMotion;   // after a live check every row stays read
  const paint = () => {
    if (settled) {
      rows.forEach(r => { r.classList.add('is-read'); r.classList.remove('is-cursor'); });
      return;
    }
    const p = parseFloat(getComputedStyle(act).getPropertyValue('--sc-p')) || 0;
    const at = Math.min(rows.length - 1, Math.floor(p * (rows.length + 1.5)));
    rows.forEach((r, i) => {
      r.classList.toggle('is-read', i <= at);
      r.classList.toggle('is-cursor', i === at && p < 0.8);
    });
  };

  let visible = false;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { rootMargin: '10% 0px' }).observe(act);
  const loop = () => { if (visible) paint(); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  paint();

  /* live check */
  const form = document.getElementById('check');
  const input = document.getElementById('domain');
  const msg = document.getElementById('check-msg');
  const btn = form.querySelector('button');

  input.addEventListener('focus', () => { settled = true; paint(); });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const domain = input.value.trim();
    if (!domain) { msg.textContent = T('Type a domain, for example yourcompany.com.', 'Bir alan adı yazın, örneğin sirketiniz.com.'); input.focus(); return; }

    btn.disabled = true;
    msg.textContent = T('Reading robots.txt, sitemap, llms.txt and the home page…', 'robots.txt, sitemap, llms.txt ve ana sayfa okunuyor…');
    try {
      const res = await fetch('/check.php', { method: 'POST', body: new URLSearchParams({ domain }) });
      const r = await res.json();
      if (!r.ok) {
        msg.textContent = {
          invalid_domain: T('That does not look like a domain. Try yourcompany.com.', 'Bu bir alan adına benzemiyor. sirketiniz.com gibi deneyin.'),
          rate_limited:   T('Too many checks in a few minutes. Try again shortly.', 'Kısa sürede çok fazla kontrol yapıldı. Biraz sonra tekrar deneyin.'),
          unreachable:    T('We could not reach that site from our server.', 'Bu siteye sunucumuzdan ulaşamadık.'),
        }[r.error] || T('The check failed. Try again shortly.', 'Kontrol başarısız oldu. Biraz sonra tekrar deneyin.');
        return;
      }
      settled = true;
      renderPanel(r, { sample: false });
      paint();
      carryDomain(r.domain);
      const blocked = r.crawlers.filter(c => c.status === 'blocked').length;
      msg.innerHTML = (blocked
        ? esc(T(`${blocked} of ${r.crawlers.length} AI crawlers are blocked. `, `${r.crawlers.length} yapay zekâ tarayıcısından ${blocked} tanesi engelli. `))
        : esc(T('No AI crawler is blocked. ', 'Hiçbir yapay zekâ tarayıcısı engelli değil. ')))
        + `<a href="#contact">${esc(T('Want the gaps closed? Write to us', 'Eksikleri kapatalım mı? Bize yazın'))}</a>`;
    } catch (err) {
      msg.textContent = T('The check failed. Try again shortly.', 'Kontrol başarısız oldu. Biraz sonra tekrar deneyin.');
    } finally {
      btn.disabled = false;
    }
  });
}

/* Selected state carries into the inquiry: the tested domain opens the message */
let carried = '';
function carryDomain(domain) {
  const box = document.getElementById('message');
  const line = T(`Site I checked: ${domain}`, `Kontrol ettiğim site: ${domain}`);
  if (!box.value.trim() || box.value.startsWith(carried)) {
    box.value = line + '\n\n' + box.value.slice(carried ? carried.length : 0).replace(/^\n+/, '');
    carried = line;
  }
}

/* ════════════════════════════════════════════
   WORK — the index and its media column
════════════════════════════════════════════ */
function initWork() {
  const entries = [...document.querySelectorAll('#index .entry')];
  const img = document.getElementById('viewer-img');
  const cap = document.getElementById('viewer-cap');
  if (!entries.length || !img) return;

  const show = entry => {
    entries.forEach(e => e.classList.toggle('is-active', e === entry));
    if (img.dataset.src === entry.dataset.img) return;
    img.dataset.src = entry.dataset.img;
    img.src = `/assets/images/md/${entry.dataset.img}.webp`;
    cap.textContent = entry.querySelector('h3').textContent;
  };

  entries.forEach(e => {
    e.addEventListener('mouseenter', () => show(e));
    e.addEventListener('focusin', () => show(e));
  });
  /* without a pointer, the entry crossing the middle of the screen takes the frame */
  const io = new IntersectionObserver(found => {
    found.forEach(f => { if (f.isIntersecting) show(f.target); });
  }, { rootMargin: '-48% 0px -48% 0px' });
  entries.forEach(e => io.observe(e));
}

/* ════════════════════════════════════════════
   CONTACT — honest status, no false success
════════════════════════════════════════════ */
function initContact() {
  const form = document.getElementById('contact-form');
  const status = document.getElementById('form-status');
  const btn = form.querySelector('button');

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (form._honey.value) return;
    if (!form.name.value.trim() || !form.email.validity.valid || !form.email.value || !form.message.value.trim()) {
      status.className = 'form__status is-err';
      status.textContent = T('Please fill in your name, a valid email and a message.', 'Lütfen adınızı, geçerli bir e-posta ve mesajınızı yazın.');
      return;
    }
    btn.disabled = true;
    status.className = 'form__status';
    status.textContent = T('Sending…', 'Gönderiliyor…');
    try {
      const res = await fetch('/contact.php', { method: 'POST', body: new FormData(form) });
      const r = await res.json();
      if (!r.success) throw new Error();
      status.className = 'form__status is-ok';
      status.textContent = T('Sent. We will get back to you soon.', 'Gönderildi. En kısa sürede dönüş yapacağız.');
      form.reset();
      carried = '';
    } catch (err) {
      status.className = 'form__status is-err';
      status.textContent = T('Your message could not be sent. Please try again in a minute.', 'Mesajınız gönderilemedi. Lütfen bir dakika sonra tekrar deneyin.');
    } finally {
      btn.disabled = false;
    }
  });
}

/* ════════════════════════════════════════════
   INIT
════════════════════════════════════════════ */
document.getElementById('year').textContent = new Date().getFullYear();
initLangSwitch();
initFolio();
initCrawlerRead();
initWork();
initContact();
if (window.ScrollCraft) window.ScrollCraft.mount(document.body);
