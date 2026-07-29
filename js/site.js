/* ═══════════════════════════════════════════════════════════════
   Nourish & Knowledge — site behaviour
   Progressive enhancement only: every feature degrades to plain
   HTML if JS is unavailable.
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.documentElement.classList.remove('no-js');

  /* ── Theme ─────────────────────────────────────────────────
     The initial theme is set by an inline snippet in <head> to
     avoid a flash; here we only handle toggling and persistence. */
  function initTheme() {
    var toggles = document.querySelectorAll('[data-theme-toggle]');
    if (!toggles.length) return;

    function current() {
      return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    }

    function sync() {
      var isDark = current() === 'dark';
      toggles.forEach(function (btn) {
        btn.setAttribute('aria-pressed', String(isDark));
        btn.setAttribute('aria-label', isDark ? 'Switch to light theme' : 'Switch to dark theme');
        btn.setAttribute('title', isDark ? 'Light theme' : 'Dark theme');
      });
    }

    toggles.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var next = current() === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        try {
          localStorage.setItem('nk-theme', next);
        } catch (e) { /* private mode — theme just won't persist */ }
        sync();
      });
    });

    sync();
  }

  /* ── Navigation ────────────────────────────────────────────
     Transparent over the dark page header, solid once scrolled. */
  function initNav() {
    var nav = document.querySelector('.site-nav');
    if (!nav) return;

    var toggle = nav.querySelector('.nav-toggle');
    var panel = nav.querySelector('.nav-panel');
    var desktop = window.matchMedia('(min-width: 901px)');

    /* Mark the current page for both styling and screen readers */
    var here = window.location.pathname.split('/').pop() || 'index.html';
    nav.querySelectorAll('.nav-menu a').forEach(function (link) {
      if (link.getAttribute('href') === here) {
        link.setAttribute('aria-current', 'page');
      }
    });

    var solid = false;
    function onScroll() {
      var shouldBeSolid = window.scrollY > 28;
      if (shouldBeSolid !== solid) {
        solid = shouldBeSolid;
        nav.classList.toggle('is-solid', solid);
      }
    }

    function closeMenu() {
      if (!toggle || !panel) return;
      toggle.setAttribute('aria-expanded', 'false');
      panel.classList.remove('open');
      document.body.classList.remove('nav-open');
    }

    if (toggle && panel) {
      toggle.addEventListener('click', function () {
        var open = toggle.getAttribute('aria-expanded') === 'true';
        toggle.setAttribute('aria-expanded', String(!open));
        panel.classList.toggle('open', !open);
        document.body.classList.toggle('nav-open', !open);
        /* An open drawer sits on an opaque panel, so keep the bar solid */
        if (!open) nav.classList.add('is-solid');
        else onScroll();
      });

      panel.querySelectorAll('a').forEach(function (link) {
        link.addEventListener('click', closeMenu);
      });

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeMenu();
      });

      /* Resizing past the breakpoint should never strand a stuck drawer */
      desktop.addEventListener('change', function (e) {
        if (e.matches) closeMenu();
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ── Scroll progress thread ────────────────────────────────── */
  function initProgress() {
    var bar = document.querySelector('.scroll-progress');
    if (!bar) return;

    var ticking = false;
    function update() {
      ticking = false;
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
      bar.style.scale = p + ' 1';
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }, { passive: true });

    window.addEventListener('resize', update, { passive: true });
    update();
  }

  /* ── Back to top ───────────────────────────────────────────── */
  function initToTop() {
    var btn = document.querySelector('.to-top');
    if (!btn) return;

    var ticking = false;
    function update() {
      ticking = false;
      btn.classList.toggle('show', window.scrollY > 640);
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }, { passive: true });

    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });

    update();
  }

  /* ── Reveal on scroll ──────────────────────────────────────── */
  function initReveal() {
    var targets = document.querySelectorAll('[data-reveal]');
    if (!targets.length) return;

    if (reduceMotion || !('IntersectionObserver' in window)) {
      targets.forEach(function (el) { el.classList.add('in'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    targets.forEach(function (el) { io.observe(el); });

    /* Children of a [data-stagger] container cascade in sequence */
    document.querySelectorAll('[data-stagger]').forEach(function (group) {
      var step = parseFloat(group.getAttribute('data-stagger')) || 0.08;
      Array.prototype.forEach.call(group.children, function (child, i) {
        if (child.hasAttribute('data-reveal')) {
          child.style.transitionDelay = (i * step) + 's';
        }
      });
    });
  }

  /* ── Counting statistics ───────────────────────────────────── */
  function initCounters() {
    var counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;

    function render(el, value) {
      var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
      var text = decimals > 0
        ? value.toFixed(decimals)
        : Math.round(value).toLocaleString('en-US');
      el.textContent = (el.getAttribute('data-prefix') || '') + text + (el.getAttribute('data-suffix') || '');
    }

    function run(el) {
      var target = parseFloat(el.getAttribute('data-count'));
      if (isNaN(target)) return;

      if (reduceMotion) {
        render(el, target);
        return;
      }

      var duration = 1500;
      var start = null;

      function frame(now) {
        if (start === null) start = now;
        var t = Math.min((now - start) / duration, 1);
        /* easeOutCubic — fast start, gentle landing */
        var eased = 1 - Math.pow(1 - t, 3);
        render(el, target * eased);
        if (t < 1) requestAnimationFrame(frame);
      }

      requestAnimationFrame(frame);
    }

    if (!('IntersectionObserver' in window)) {
      counters.forEach(run);
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          run(entry.target);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    /* Deliberately not zeroing the text up front: the markup already holds
       the real figure, so anything never scrolled into view still reads
       correctly. The count simply starts when the element appears. */
    counters.forEach(function (el) {
      io.observe(el);
    });
  }

  /* ── Accordions ────────────────────────────────────────────── */
  function initAccordions() {
    document.querySelectorAll('.accordion').forEach(function (acc) {
      var triggers = acc.querySelectorAll('.acc-trigger');
      var exclusive = acc.hasAttribute('data-exclusive');

      function close(trigger) {
        var panel = document.getElementById(trigger.getAttribute('aria-controls'));
        if (!panel) return;
        /* Fix the current height first so the transition has somewhere to go */
        panel.style.height = panel.scrollHeight + 'px';
        requestAnimationFrame(function () {
          panel.style.height = '0px';
        });
        trigger.setAttribute('aria-expanded', 'false');
      }

      function open(trigger) {
        var panel = document.getElementById(trigger.getAttribute('aria-controls'));
        if (!panel) return;
        panel.style.height = panel.scrollHeight + 'px';
        trigger.setAttribute('aria-expanded', 'true');
        /* Release to auto once settled so reflowing text isn't clipped */
        panel.addEventListener('transitionend', function done(e) {
          if (e.propertyName !== 'height') return;
          panel.removeEventListener('transitionend', done);
          if (trigger.getAttribute('aria-expanded') === 'true') {
            panel.style.height = 'auto';
          }
        });
      }

      triggers.forEach(function (trigger) {
        trigger.addEventListener('click', function () {
          var isOpen = trigger.getAttribute('aria-expanded') === 'true';

          if (exclusive && !isOpen) {
            triggers.forEach(function (other) {
              if (other !== trigger && other.getAttribute('aria-expanded') === 'true') {
                close(other);
              }
            });
          }

          if (isOpen) close(trigger);
          else open(trigger);
        });
      });
    });
  }

  /* ── Contact form ──────────────────────────────────────────
     No backend here, so a valid submission hands off to the
     visitor's own mail client with everything pre-filled. */
  function initForms() {
    document.querySelectorAll('[data-mail-form]').forEach(initForm);
  }

  function initForm(form) {
    var status = form.querySelector('.form-status');
    var to = form.getAttribute('data-mail-to') || '';

    function fieldOf(input) {
      return input.closest('.field');
    }

    function validate(input) {
      var field = fieldOf(input);
      if (!field) return true;
      var ok = input.checkValidity();
      field.classList.toggle('invalid', !ok);
      var error = field.querySelector('.error');
      if (error) error.textContent = ok ? '' : (input.validationMessage || 'Please check this field.');
      return ok;
    }

    form.querySelectorAll('input, textarea, select').forEach(function (input) {
      input.addEventListener('blur', function () { validate(input); });
      input.addEventListener('input', function () {
        if (fieldOf(input) && fieldOf(input).classList.contains('invalid')) validate(input);
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var inputs = Array.prototype.slice.call(form.querySelectorAll('input, textarea, select'));
      var firstBad = null;

      inputs.forEach(function (input) {
        if (!validate(input) && !firstBad) firstBad = input;
      });

      if (firstBad) {
        firstBad.focus();
        firstBad.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
        return;
      }

      var data = new FormData(form);
      var name = (data.get('name') || '').toString().trim();
      var email = (data.get('email') || '').toString().trim();
      var topic = (data.get('topic') || '').toString().trim();
      var message = (data.get('message') || '').toString().trim();

      var subject = form.getAttribute('data-mail-subject') ||
        (topic ? topic + ' — message from ' + name : 'Message from ' + name);

      /* Forms differ (full enquiry vs. one-field sign-up), so assemble the
         body from whichever fields are actually present. */
      var lines = [message || form.getAttribute('data-mail-body') || ''];
      lines.push('', '—');
      if (name) lines.push(name);
      if (email) lines.push(email);

      window.location.href = 'mailto:' + to +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(lines.join('\n'));

      if (status) {
        status.classList.add('show');
        status.setAttribute('role', 'status');
      }

      form.reset();
    });
  }

  /* ── Home hero: starfield + scroll choreography ────────────── */
  function initHero() {
    var hero = document.querySelector('.hero');
    if (!hero) return;

    var globe = hero.querySelector('.hero-globe');
    var content = hero.querySelector('.hero-content');
    var stars = hero.querySelector('.stars');
    var cue = hero.querySelector('.scroll-cue');

    if (reduceMotion) return;

    if (stars) {
      var frag = document.createDocumentFragment();
      for (var i = 0; i < 80; i++) {
        var s = document.createElement('span');
        var size = Math.random() * 2 + 1;
        s.className = 'star';
        s.style.width = size + 'px';
        s.style.height = size + 'px';
        s.style.left = (Math.random() * 100) + '%';
        s.style.top = (Math.random() * 88) + '%';
        s.style.setProperty('--tw', (Math.random() * 3 + 2).toFixed(2) + 's');
        s.style.setProperty('--td', (Math.random() * 4).toFixed(2) + 's');
        frag.appendChild(s);
      }
      stars.appendChild(frag);
    }

    var ticking = false;
    function apply() {
      ticking = false;
      var y = window.scrollY;
      var h = hero.offsetHeight || 1;
      var p = Math.min(Math.max(y / (h * 0.85), 0), 1);

      if (globe) {
        /* Keep the CSS base offset (-50%, 62%) or the globe jumps on first scroll */
        globe.style.transform =
          'translate(-50%, 62%) translateY(' + (-y * 0.3 - p * 70) + 'px) scale(' + (1 + p * 0.1) + ')';
        globe.style.opacity = String(Math.max(1 - p * 1.25, 0));
      }
      if (stars) {
        stars.style.opacity = String(Math.min(p * 1.8, 1));
        stars.style.transform = 'translateY(' + (-y * 0.22) + 'px)';
      }
      if (content) {
        content.style.transform = 'translateY(' + (-y * 0.14) + 'px)';
        content.style.opacity = String(Math.max(1 - p * 1.4, 0));
      }
      if (cue) {
        cue.style.opacity = String(Math.max(1 - p * 3, 0));
      }
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(apply);
      }
    }, { passive: true });

    apply();
  }

  function boot() {
    initTheme();
    initNav();
    initProgress();
    initToTop();
    initReveal();
    initCounters();
    initAccordions();
    initForms();
    initHero();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
