/* main.js - Core interactions, animations, copy code, quote highlight */
'use strict';

// ============================================================
//  TOAST NOTIFICATIONS
// ============================================================
const Toast = (() => {
  let container;

  function getContainer() {
    if (!container) {
      container = document.getElementById('toast-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
      }
    }
    return container;
  }

  function show(msg, type = 'info', duration = 3500) {
    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️', copied: '📋' };
    const toast = document.createElement('div');
    toast.className = 'toast-item';
    toast.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span>${msg}</span>`;
    getContainer().appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-out');
      toast.addEventListener('animationend', () => toast.remove(), { once: true });
    }, duration);
  }

  return { show };
})();

// ============================================================
//  CUSTOM CURSOR
// ============================================================
const Cursor = (() => {
  let dot, ring, ringX = 0, ringY = 0, dotX = 0, dotY = 0;

  function init() {
    dot = document.getElementById('cursor-dot');
    ring = document.getElementById('cursor-ring');
    if (!dot || !ring) return;

    document.addEventListener('mousemove', (e) => {
      dotX = e.clientX; dotY = e.clientY;
      dot.style.left = dotX + 'px';
      dot.style.top = dotY + 'px';
    });

    // Smooth ring follow
    function animateRing() {
      ringX += (dotX - ringX) * 0.12;
      ringY += (dotY - ringY) * 0.12;
      ring.style.left = ringX + 'px';
      ring.style.top = ringY + 'px';
      requestAnimationFrame(animateRing);
    }
    animateRing();

    // Hover effect on interactive elements
    const hoverSel = 'a, button, [data-hover], .blog-card, .nav-link-custom, input, textarea';
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(hoverSel)) ring.classList.add('hovering');
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest(hoverSel)) ring.classList.remove('hovering');
    });
  }

  return { init };
})();

// ============================================================
//  SCROLL EFFECTS
// ============================================================
const ScrollFX = (() => {
  let progressBar;

  function initProgress() {
    progressBar = document.getElementById('scroll-progress');
    if (!progressBar) return;
    window.addEventListener('scroll', () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      progressBar.style.width = (scrollTop / docHeight * 100) + '%';
    }, { passive: true });
  }

  function initNavScroll() {
    const nav = document.querySelector('.navbar-custom');
    if (!nav) return;
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 40);
    }, { passive: true });
  }

  function initBackToTop() {
    const btn = document.getElementById('back-to-top');
    if (!btn) return;
    window.addEventListener('scroll', () => {
      btn.classList.toggle('visible', window.scrollY > 400);
    }, { passive: true });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  function initIntersectionObserver() {
    const opts = { threshold: 0.12, rootMargin: '0px 0px -60px 0px' };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, opts);

    document.querySelectorAll('.animate-on-scroll, .stagger-children').forEach(el => observer.observe(el));
  }

  function init() {
    initProgress();
    initNavScroll();
    initBackToTop();
    initIntersectionObserver();
  }

  return { init };
})();

// ============================================================
//  3D CARD TILT
// ============================================================
const CardTilt = (() => {
  function applyTilt(card) {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);
      card.style.transform = `translateY(-8px) rotateX(${-dy * 6}deg) rotateY(${dx * 6}deg)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  }

  function init() {
    document.querySelectorAll('.blog-card').forEach(applyTilt);
  }

  return { init };
})();

// ============================================================
//  COPY CODE BUTTON
// ============================================================
const CopyCode = (() => {
  function addButtons() {
    document.querySelectorAll('pre').forEach(pre => {
      // Avoid duplicating
      if (pre.querySelector('.copy-code-btn')) return;

      const btn = document.createElement('button');
      btn.className = 'copy-code-btn';
      btn.setAttribute('aria-label', 'Copy code to clipboard');
      btn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy';

      btn.addEventListener('click', async () => {
        const code = pre.querySelector('code');
        const text = code ? code.innerText : pre.innerText;
        try {
          await navigator.clipboard.writeText(text);
          btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
          btn.classList.add('copied');
          Toast.show('Code copied to clipboard!', 'copied', 2000);
          setTimeout(() => {
            btn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy';
            btn.classList.remove('copied');
          }, 2000);
        } catch {
          // Fallback
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
          btn.classList.add('copied');
          setTimeout(() => {
            btn.innerHTML = '<i class="fa-regular fa-copy"></i> Copy';
            btn.classList.remove('copied');
          }, 2000);
        }
      });

      pre.appendChild(btn);
    });
  }

  function init() {
    // Wait for dynamic content to load
    setTimeout(addButtons, 500);
    // Also observe for changes
    const observer = new MutationObserver(() => addButtons());
    observer.observe(document.body, { childList: true, subtree: true });
  }

  return { init };
})();

// ============================================================
//  QUOTE HIGHLIGHTING
// ============================================================
const QuoteHighlight = (() => {
  let bar;
  let selectedText = '';

  function createBar() {
    bar = document.getElementById('quote-highlight-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'quote-highlight-bar';
      bar.className = 'quote-highlight-bar';
      bar.innerHTML = `
        <button class="quote-btn highlight-btn" title="Highlight text">
          <i class="fa-solid fa-highlighter"></i> Highlight
        </button>
        <button class="quote-btn copy-btn" title="Copy selection">
          <i class="fa-regular fa-copy"></i> Copy
        </button>
        <button class="quote-btn tweet-btn" title="Share on X (Twitter)">
          <i class="fa-brands fa-x-twitter"></i> Tweet
        </button>
        <button class="quote-btn quote-it-btn" title="Quote in comment">
          <i class="fa-solid fa-quote-right"></i> Quote
        </button>
      `;
      document.body.appendChild(bar);
    }

    // Highlight button
    const highlightBtn = bar.querySelector('.highlight-btn');
    if (highlightBtn) {
      highlightBtn.addEventListener('click', () => {
        highlightSelection();
        hideBar();
      });
    }

    // Copy button
    const copyBtn = bar.querySelector('.copy-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(selectedText).then(() => {
          Toast.show('Text copied!', 'copied', 2000);
        });
        hideBar();
      });
    }

    // Tweet button
    const tweetBtn = bar.querySelector('.tweet-btn');
    if (tweetBtn) {
      tweetBtn.addEventListener('click', () => {
        const tweet = encodeURIComponent(`"${selectedText.slice(0, 200)}" — via Kartik Yadav Gurve's Blog`);
        window.open(`https://twitter.com/intent/tweet?text=${tweet}`, '_blank');
        hideBar();
      });
    }

    // Quote it button
    const quoteBtn = bar.querySelector('.quote-it-btn');
    if (quoteBtn) {
      quoteBtn.addEventListener('click', () => {
        const commentBox = document.querySelector('#comment-body, .comment-textarea, #commentBox, textarea');
        if (commentBox) {
          commentBox.value = `> ${selectedText}\n\n` + (commentBox.value || '');
          commentBox.focus();
          Toast.show('Quoted in comment box!', 'info', 2000);
        } else {
          navigator.clipboard.writeText(`> ${selectedText}`);
          Toast.show('Quoted text copied!', 'copied', 2000);
        }
        hideBar();
      });
    }
  }

  function showBar(x, y) {
    if (!bar) return;
    bar.classList.add('visible');
    const barW = 300;
    const left = Math.min(x, window.innerWidth - barW - 16);
    bar.style.left = Math.max(8, left) + 'px';
    bar.style.top = (y - 54) + 'px';
  }

  function hideBar() {
    if (bar) bar.classList.remove('visible');
    selectedText = '';
  }

  function highlightSelection() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    try {
      const range = selection.getRangeAt(0);
      const span = document.createElement('mark');
      span.className = 'text-highlighted';
      span.title = 'Click to remove highlight';
      span.addEventListener('click', () => {
        const parent = span.parentNode;
        while (span.firstChild) parent.insertBefore(span.firstChild, span);
        parent.removeChild(span);
        Toast.show('Highlight removed', 'info', 1500);
      });
      range.surroundContents(span);
      selection.removeAllRanges();
      Toast.show('Text highlighted! Click to remove.', 'info', 2500);
    } catch (e) {
      Toast.show('Cannot highlight across multiple elements', 'warning', 2500);
    }
  }

  function init() {
    createBar();

    // Only activate on selectable content
    document.addEventListener('mouseup', (e) => {
      // Don't activate on buttons, inputs, or the bar itself
      if (e.target.closest('button') || e.target.closest('input') || e.target.closest('.quote-highlight-bar')) {
        hideBar();
        return;
      }
      handleSelection();
    });

    document.addEventListener('mousedown', (e) => {
      if (bar && !bar.contains(e.target)) hideBar();
    });
  }

  function handleSelection() {
    setTimeout(() => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) { hideBar(); return; }
      const text = selection.toString().trim();
      if (text.length < 10) { hideBar(); return; }

      selectedText = text;
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      const x = rect.left + window.scrollX + rect.width / 2;
      const y = rect.top + window.scrollY;
      showBar(x, y);
    }, 10);
  }

  return { init };
})();

// ============================================================
//  TYPEWRITER EFFECT
// ============================================================
const Typewriter = (() => {
  function init(el, words, speed = 100) {
    if (!el) return;
    let wordIdx = 0, charIdx = 0, deleting = false;

    function type() {
      const word = words[wordIdx % words.length];
      if (deleting) {
        el.textContent = word.slice(0, --charIdx);
        if (charIdx === 0) { deleting = false; wordIdx++; setTimeout(type, 400); return; }
        setTimeout(type, speed / 2);
      } else {
        el.textContent = word.slice(0, ++charIdx);
        if (charIdx === word.length) { deleting = true; setTimeout(type, 2000); return; }
        setTimeout(type, speed);
      }
    }
    type();
  }

  return { init };
})();

// ============================================================
//  STATS COUNTER ANIMATION
// ============================================================
const StatsCounter = (() => {
  function animateCount(el) {
    const target = parseInt(el.dataset.count, 10);
    const duration = 1800;
    const start = performance.now();
    function update(now) {
      const t = Math.min((now - start) / duration, 1);
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      el.textContent = Math.round(ease * target).toLocaleString() + (el.dataset.suffix || '');
      if (t < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  function init() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    document.querySelectorAll('[data-count]').forEach(el => observer.observe(el));
  }

  return { init };
})();

// ============================================================
//  TABLE OF CONTENTS — active link on scroll
// ============================================================
const TOC = (() => {
  function init() {
    const links = document.querySelectorAll('.toc-link');
    if (!links.length) return;

    const headings = [...links].map(l => document.querySelector(l.getAttribute('href'))).filter(Boolean);

    window.addEventListener('scroll', () => {
      let current = headings[0];
      headings.forEach(h => { if (window.scrollY >= h.offsetTop - 120) current = h; });
      links.forEach(l => {
        l.classList.toggle('active', l.getAttribute('href') === '#' + current.id);
      });
    }, { passive: true });
  }

  return { init };
})();

// ============================================================
//  READING PROGRESS (blog post page)
// ============================================================
const ReadingProgress = (() => {
  function init() {
    const bar = document.querySelector('.reading-progress');
    const content = document.querySelector('.post-content');
    if (!bar || !content) return;

    window.addEventListener('scroll', () => {
      const rect = content.getBoundingClientRect();
      const total = content.offsetHeight;
      const read = -rect.top;
      bar.style.width = Math.min(100, Math.max(0, (read / total) * 100)) + '%';
    }, { passive: true });
  }

  return { init };
})();

// ============================================================
//  SKILL RINGS (About page)
// ============================================================
const SkillRings = (() => {
  function animate(el) {
    const pct = parseInt(el.dataset.pct, 10) / 100;
    const circle = el.querySelector('.skill-ring-fill');
    if (!circle) return;
    const r = circle.r.baseVal.value;
    const circ = 2 * Math.PI * r;
    circle.style.strokeDasharray = circ;
    circle.style.strokeDashoffset = circ;
    setTimeout(() => {
      circle.style.strokeDashoffset = circ * (1 - pct);
    }, 100);
  }

  function init() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { animate(entry.target); observer.unobserve(entry.target); }
      });
    }, { threshold: 0.5 });

    document.querySelectorAll('.skill-ring-wrap[data-pct]').forEach(el => observer.observe(el));
  }

  return { init };
})();

// ============================================================
//  LOADING SCREEN
// ============================================================
const Loader = (() => {
  function init() {
    const screen = document.getElementById('loading-screen');
    if (!screen) return;

    const canvas = screen.querySelector('canvas');
    if (canvas && typeof THREE !== 'undefined' && typeof ThreeScenes !== 'undefined') {
      ThreeScenes.initLoadingScene(canvas);
    }

    window.addEventListener('load', () => {
      setTimeout(() => {
        screen.style.opacity = '0';
        screen.style.transition = 'opacity 0.5s ease';
        setTimeout(() => {
          screen.style.display = 'none';
          if (typeof ThreeScenes !== 'undefined') ThreeScenes.stopLoadingScene();
        }, 500);
      }, 800);
    });
  }

  return { init };
})();

// ============================================================
//  INIT ALL
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // Theme first (prevents flash)
  if (typeof ThemeToggle !== 'undefined') ThemeToggle.init();

  // Core
  Cursor.init();
  ScrollFX.init();
  Loader.init();

  // Content features
  CopyCode.init();
  QuoteHighlight.init();
  CardTilt.init();
  StatsCounter.init();
  TOC.init();
  ReadingProgress.init();
  SkillRings.init();

  // Newsletter
  if (typeof Newsletter !== 'undefined') Newsletter.init();

  // Hero typewriter
  const twEl = document.getElementById('typewriter-text');
  if (twEl) {
    Typewriter.init(twEl, [
      'Full-Stack Developer',
      'Android Developer',
      'Hackathon Enthusiast',
      'Problem Solver',
      'CS Student @SGGS',
    ]);
  }

  // Hero Three.js - with null check
  const heroCanvas = document.getElementById('hero-canvas');
  if (heroCanvas && typeof THREE !== 'undefined' && typeof ThreeScenes !== 'undefined') {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    ThreeScenes.initHeroScene(heroCanvas, isDark);
  }

  // Active nav link
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link-custom').forEach(link => {
    const href = link.getAttribute('href') || '';
    if (href && path.includes(href.replace('.html', ''))) link.classList.add('active');
    if (path === 'index.html' && href === 'index.html') link.classList.add('active');
  });
});