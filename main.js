/* ════════════════════════════════════════════
   erdalbayhan.com — main.js
════════════════════════════════════════════ */

/* ── Typed.js strings per language ── */
const TYPED = {
  tr: [
    'Web Tasarımcılarıyız.',
    'Web Geliştiricileriyiz.',
    'Marka Kimliği Uzmanlarıyız.',
    'Dijital Proje Ortaklarıyız.',
    'SEO Uzmanlarıyız.',
    'Sosyal Medya Uzmanlarıyız.',
  ],
  en: [
    'Web Designers.',
    'Web Developers.',
    'Brand Identity Experts.',
    'Digital Project Partners.',
    'SEO Specialists.',
    'Social Media Experts.',
  ],
};

/* ── State ── */
let currentLang = localStorage.getItem('eb-lang') ||
  (navigator.language.startsWith('tr') ? 'tr' : 'en');

let typedInstance = null;

/* ════════════════════════════════════════════
   LANGUAGE
════════════════════════════════════════════ */
function applyLang(lang) {
  currentLang = lang;
  document.documentElement.lang = lang;
  localStorage.setItem('eb-lang', lang);

  /* Text nodes */
  document.querySelectorAll('[data-tr][data-en]').forEach(el => {
    el.textContent = el.dataset[lang];
  });

  /* Placeholders */
  document.querySelectorAll('[data-placeholder-tr]').forEach(el => {
    el.placeholder = lang === 'tr'
      ? el.dataset.placeholderTr
      : el.dataset.placeholderEn;
  });

  /* Page meta */
  if (lang === 'en') {
    document.title = 'Erdal Bayhan — Web Design & Digital Services';
    document.querySelector('meta[name="description"]').content =
      'Erdal Bayhan — Web design, development, brand identity, SEO, GEO and SEM services.';
  } else {
    document.title = 'Erdal Bayhan — Web Tasarım & Dijital Hizmetler';
    document.querySelector('meta[name="description"]').content =
      'Erdal Bayhan — Web tasarımı, geliştirme, marka kimliği, SEO, GEO ve SEM hizmetleri.';
  }

  /* Reinit Typed with new strings */
  if (typedInstance) {
    typedInstance.destroy();
    document.getElementById('typed-output').textContent = '';
  }
  initTyped(lang);
}

function initTyped(lang) {
  if (typeof Typed === 'undefined') return;
  typedInstance = new Typed('#typed-output', {
    strings: TYPED[lang],
    typeSpeed: 58,
    backSpeed: 32,
    backDelay: 2400,
    loop: true,
    smartBackspace: true,
    cursorChar: '|',
  });
}

document.getElementById('lang-btn').addEventListener('click', () => {
  applyLang(currentLang === 'tr' ? 'en' : 'tr');
});

/* ════════════════════════════════════════════
   NAVBAR
════════════════════════════════════════════ */
const navbar    = document.getElementById('navbar');
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('nav-links');
const sections  = document.querySelectorAll('section[id]');

window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 48);
  highlightNav();
}, { passive: true });

hamburger.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  hamburger.classList.toggle('open');
  hamburger.setAttribute('aria-expanded', String(open));
  document.body.style.overflow = open ? 'hidden' : '';
});

navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', closeMenu);
});

function closeMenu() {
  navLinks.classList.remove('open');
  hamburger.classList.remove('open');
  hamburger.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

function highlightNav() {
  const y = window.scrollY + 100;
  sections.forEach(sec => {
    const link = document.querySelector(`.nav-link[href="#${sec.id}"]`);
    if (link) {
      link.classList.toggle('active', y >= sec.offsetTop && y < sec.offsetTop + sec.offsetHeight);
    }
  });
}

/* ════════════════════════════════════════════
   SCROLL REVEAL
════════════════════════════════════════════ */
function initReveal() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

/* ════════════════════════════════════════════
   PORTFOLIO SLIDER
════════════════════════════════════════════ */
function initSliders() {
  document.querySelectorAll('.portfolio-slider').forEach(slider => {
    const track  = slider.querySelector('.slider-track');
    const dots   = slider.querySelectorAll('.dot');
    const images = slider.querySelectorAll('img');
    let current  = 0;
    let timer    = null;

    if (images.length <= 1) return;

    function goTo(idx) {
      current = (idx + images.length) % images.length;
      track.style.transform = `translateX(-${current * 100}%)`;
      dots.forEach((d, i) => d.classList.toggle('active', i === current));
    }

    function startAuto() {
      timer = setInterval(() => goTo(current + 1), 3000);
    }
    function stopAuto() {
      clearInterval(timer);
    }

    /* Dot click */
    dots.forEach((dot, i) => {
      dot.addEventListener('click', () => { goTo(i); stopAuto(); startAuto(); });
    });

    /* Touch swipe */
    let touchX = 0;
    slider.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
    slider.addEventListener('touchend', e => {
      const diff = touchX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) { goTo(current + (diff > 0 ? 1 : -1)); stopAuto(); startAuto(); }
    });

    /* Pause on hover */
    slider.addEventListener('mouseenter', stopAuto);
    slider.addEventListener('mouseleave', startAuto);

    startAuto();
  });
}

/* ════════════════════════════════════════════
   3D TILT (desktop hover only)
════════════════════════════════════════════ */
function initTilt() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  document.querySelectorAll('[data-tilt]').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r   = card.getBoundingClientRect();
      const x   = (e.clientX - r.left) / r.width  - 0.5;
      const y   = (e.clientY - r.top)  / r.height - 0.5;
      card.style.transition = 'transform 0.1s ease';
      card.style.transform  = `perspective(900px) rotateY(${x * 9}deg) rotateX(${-y * 9}deg) scale(1.025)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transition = 'transform 0.5s ease, box-shadow 0.3s ease';
      card.style.transform  = 'perspective(900px) rotateY(0deg) rotateX(0deg) scale(1)';
    });
  });
}

/* ════════════════════════════════════════════
   CONTACT FORM
════════════════════════════════════════════ */
function initForm() {
  const form   = document.getElementById('contact-form');
  const btn    = document.getElementById('submit-btn');
  const status = document.getElementById('form-status');
  if (!form) return;

  form.addEventListener('submit', async e => {
    e.preventDefault();

    /* Honeypot */
    const honey = form.querySelector('[name="_honey"]');
    if (honey && honey.value) return;

    btn.classList.add('loading');
    btn.disabled = true;
    status.textContent = '';
    status.className = 'form-status';

    try {
      const res  = await fetch('contact.php', { method: 'POST', body: new FormData(form) });
      const json = await res.json();

      if (json.success) {
        status.textContent = currentLang === 'tr'
          ? 'Mesajınız iletildi! En kısa sürede dönelim.'
          : "Message sent! We'll get back to you soon.";
        status.className = 'form-status success';
        form.reset();
      } else {
        throw new Error();
      }
    } catch {
      status.textContent = currentLang === 'tr'
        ? 'Bir hata oluştu. Lütfen tekrar deneyin.'
        : 'Something went wrong. Please try again.';
      status.className = 'form-status error';
    } finally {
      btn.classList.remove('loading');
      btn.disabled = false;
    }
  });
}

/* ════════════════════════════════════════════
   FOOTER YEAR
════════════════════════════════════════════ */
function setYear() {
  const el = document.getElementById('footer-year');
  if (el) el.textContent = new Date().getFullYear();
}

/* ════════════════════════════════════════════
   INIT
════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  setYear();
  applyLang(currentLang);
  initReveal();
  initSliders();
  initTilt();
  initForm();
  highlightNav();
});
