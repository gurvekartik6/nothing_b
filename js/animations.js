/**
 * animations.js — Advanced micro-animations
 * Used across all pages for enhanced visual interactions.
 * Pure JS (no GSAP dependency needed — we replicate core features).
 */

'use strict';

// ─── Parallax on scroll ──────────────────────────────────────
const Parallax = (() => {
  const elements = [];

  function register(selector, speed = 0.3) {
    document.querySelectorAll(selector).forEach(el => {
      elements.push({ el, speed });
    });
  }

  function update() {
    const scrollY = window.scrollY;
    elements.forEach(({ el, speed }) => {
      const rect = el.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const offset = (window.innerHeight / 2 - center) * speed;
      el.style.transform = `translateY(${offset}px)`;
    });
  }

  function init() {
    register('[data-parallax]');
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  return { init, register };
})();

// ─── Magnetic buttons ────────────────────────────────────────
const MagneticBtn = (() => {
  function attach(el) {
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) * 0.25;
      const dy = (e.clientY - cy) * 0.25;
      el.style.transform = `translate(${dx}px, ${dy}px)`;
    });
    el.addEventListener('mouseleave', () => {
      el.style.transform = '';
    });
  }

  function init() {
    document.querySelectorAll('[data-magnetic]').forEach(attach);
  }

  return { init, attach };
})();

// ─── Ripple effect on buttons ────────────────────────────────
const Ripple = (() => {
  function createRipple(e) {
    const btn = e.currentTarget;
    const circle = document.createElement('span');
    const diameter = Math.max(btn.clientWidth, btn.clientHeight);
    const radius = diameter / 2;
    const rect = btn.getBoundingClientRect();

    circle.style.cssText = `
      width: ${diameter}px;
      height: ${diameter}px;
      left: ${e.clientX - rect.left - radius}px;
      top: ${e.clientY - rect.top - radius}px;
      position: absolute;
      border-radius: 50%;
      background: rgba(255,255,255,0.3);
      transform: scale(0);
      animation: ripple-anim 0.6s linear;
      pointer-events: none;
    `;

    // Ensure overflow hidden on parent
    const existing = btn.style.position;
    if (!existing || existing === 'static') btn.style.position = 'relative';
    btn.style.overflow = 'hidden';

    btn.appendChild(circle);
    circle.addEventListener('animationend', () => circle.remove());
  }

  function init() {
    if (!document.getElementById('ripple-style')) {
      const style = document.createElement('style');
      style.id = 'ripple-style';
      style.textContent = `
        @keyframes ripple-anim {
          to { transform: scale(4); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
    document.querySelectorAll('.btn-primary-custom, [data-ripple]').forEach(btn => {
      btn.addEventListener('click', createRipple);
    });
  }

  return { init };
})();

// ─── Number ticker (hero stats) ──────────────────────────────
const Ticker = (() => {
  function format(n, suffix) {
    if (n >= 1000) return (n / 1000).toFixed(n % 1000 === 0 ? 0 : 1) + 'k' + (suffix || '');
    return n.toLocaleString() + (suffix || '');
  }

  function animate(el) {
    const target = parseInt(el.dataset.count, 10);
    const suffix = el.dataset.suffix || '';
    const duration = 1600;
    let startTime = null;

    function step(now) {
      if (!startTime) startTime = now;
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 4);  // ease-out-quart
      const current = Math.round(ease * target);
      el.textContent = format(current, suffix);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function init() {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animate(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });

    document.querySelectorAll('[data-count]').forEach(el => io.observe(el));
  }

  return { init };
})();

// ─── Smooth anchor scrolling ─────────────────────────────────
const SmoothScroll = (() => {
  function init() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', (e) => {
        const target = document.querySelector(link.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        const offset = 80; // navbar height
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      });
    });
  }
  return { init };
})();

// ─── Hero blob animation (CSS fallback) ─────────────────────
const HeroBlob = (() => {
  function init() {
    const blobs = document.querySelectorAll('.hero-blob');
    blobs.forEach((blob, i) => {
      const duration = 6000 + i * 1500;
      let start = null;
      function animate(now) {
        if (!start) start = now;
        const t = (now - start) / duration;
        const x = Math.sin(t * Math.PI * 2) * 30;
        const y = Math.cos(t * Math.PI * 2 * 0.7) * 20;
        blob.style.transform = `translate(${x}px, ${y}px)`;
        requestAnimationFrame(animate);
      }
      requestAnimationFrame(animate);
    });
  }
  return { init };
})();

// ─── Page transition overlay ─────────────────────────────────
const PageTransition = (() => {
  function createOverlay() {
    const div = document.createElement('div');
    div.id = 'page-transition';
    div.style.cssText = `
      position: fixed; inset: 0; z-index: 99999;
      background: var(--accent-purple);
      transform: translateY(100%);
      transition: transform 0.4s cubic-bezier(0.76, 0, 0.24, 1);
      pointer-events: none;
    `;
    document.body.appendChild(div);
    return div;
  }

  function init() {
    const overlay = createOverlay();

    // Intercept internal nav links
    document.querySelectorAll('a[href]').forEach(link => {
      const href = link.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('mailto')) return;

      link.addEventListener('click', (e) => {
        e.preventDefault();
        overlay.style.transform = 'translateY(0)';
        setTimeout(() => {
          window.location.href = href;
        }, 380);
      });
    });

    // On new page load, sweep overlay away
    window.addEventListener('pageshow', () => {
      overlay.style.transform = 'translateY(100%)';
    });
  }

  return { init };
})();

// ─── Init all animations ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  Parallax.init();
  MagneticBtn.init();
  Ripple.init();
  Ticker.init();
  SmoothScroll.init();
  HeroBlob.init();
  // PageTransition disabled by default — uncomment to enable:
  // PageTransition.init();
});
