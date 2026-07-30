/* Nourish & Knowledge — site behaviour.
   Nav, reveal-on-scroll, impact counter, rails, pledge card, mailto forms. */

(function () {
  'use strict';

  document.documentElement.classList.remove('no-js');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  };

  /* Navigation ---------------------------------------------------------- */

  function initNav() {
    var nav = $('.site-nav');
    var toggle = $('.nav-toggle');
    var panel = $('#nav-panel');

    if (nav) {
      var onScroll = function () {
        nav.classList.toggle('is-stuck', window.scrollY > 12);
      };
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    }

    if (!toggle || !panel) return;

    var setOpen = function (open) {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      panel.classList.toggle('is-open', open);
    };

    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    // Close after choosing a destination, and on Escape.
    panel.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });

    // Above 900px the drawer becomes the desktop nav; clear any open state.
    var wide = window.matchMedia('(min-width: 901px)');
    var onChange = function (e) { if (e.matches) setOpen(false); };
    if (wide.addEventListener) wide.addEventListener('change', onChange);
    else if (wide.addListener) wide.addListener(onChange);
  }

  /* Mark the current page in the nav ------------------------------------ */

  function initCurrent() {
    var here = location.pathname.split('/').pop() || 'index.html';
    $$('.nav-menu a').forEach(function (a) {
      if (a.getAttribute('href') === here) a.setAttribute('aria-current', 'page');
    });
  }

  /* Scroll progress ------------------------------------------------------ */

  function initScrollProgress() {
    var bar = $('.scroll-progress');
    if (!bar) return;

    var tick = function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.scale = (max > 0 ? window.scrollY / max : 0) + ' 1';
    };

    tick();
    window.addEventListener('scroll', tick, { passive: true });
    window.addEventListener('resize', tick);
  }

  /* Reveal on scroll ----------------------------------------------------- */

  function initReveal() {
    var items = $$('[data-reveal]');
    if (!items.length) return;

    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }

    // Stagger children of a shared container so groups cascade in.
    $$('[data-stagger]').forEach(function (group) {
      var step = parseFloat(group.getAttribute('data-stagger')) || 0.08;
      $$('[data-reveal]', group).forEach(function (el, i) {
        el.style.setProperty('--d', (i * step).toFixed(2) + 's');
      });
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        // A fast scroll can deliver the record after the element has already
        // left the viewport, so also accept anything now above the fold —
        // otherwise those elements stay invisible forever.
        if (!entry.isIntersecting && entry.boundingClientRect.top > 0) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    items.forEach(function (el) { io.observe(el); });

    // Safety net for scrolls fast enough to outrun the observer entirely.
    var pending = items.slice();
    var queued = false;

    var sweep = function () {
      queued = false;
      pending = pending.filter(function (el) {
        if (el.classList.contains('is-in')) return false;
        if (el.getBoundingClientRect().top > window.innerHeight * 0.92) return true;
        el.classList.add('is-in');
        io.unobserve(el);
        return false;
      });
      if (!pending.length) window.removeEventListener('scroll', onScroll);
    };

    var onScroll = function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(sweep);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* Impact counter ------------------------------------------------------- */

  function formatValue(decimals, prefix, suffix, value) {
    var n = decimals > 0
      ? value.toFixed(decimals)
      : Math.round(value).toLocaleString('en-US');
    return prefix + n + suffix;
  }

  function countUp(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    if (isNaN(target)) return;

    var decimals = parseInt(el.getAttribute('data-decimals'), 10) || 0;
    var prefix = el.getAttribute('data-prefix') || '';
    var suffix = el.getAttribute('data-suffix') || '';

    if (reduceMotion) {
      el.textContent = formatValue(decimals, prefix, suffix, target);
      return;
    }

    var duration = 1500;
    var start = null;

    var frame = function (now) {
      if (start === null) start = now;
      var p = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = formatValue(decimals, prefix, suffix, target * eased);
      if (p < 1) requestAnimationFrame(frame);
    };

    requestAnimationFrame(frame);
  }

  function initImpact() {
    var figure = $('.impact-figure');
    if (!figure) return;

    var items = $$('.impact-item', figure);
    var dots = $$('.impact-dots button');
    if (!items.length) return;

    var index = 0;
    var timer = null;
    var counted = [];

    var show = function (next) {
      index = (next + items.length) % items.length;

      items.forEach(function (el, i) {
        el.classList.toggle('is-active', i === index);
        el.setAttribute('aria-hidden', String(i !== index));
      });
      dots.forEach(function (d, i) {
        d.classList.toggle('is-active', i === index);
        d.setAttribute('aria-selected', String(i === index));
      });

      // Run each odometer only the first time its panel is shown.
      if (!counted[index]) {
        counted[index] = true;
        var num = $('.impact-num', items[index]);
        if (num) countUp(num);
      }
    };

    var start = function () {
      if (reduceMotion || timer || items.length < 2) return;
      timer = setInterval(function () { show(index + 1); }, 3400);
    };
    var stop = function () {
      if (timer) { clearInterval(timer); timer = null; }
    };

    dots.forEach(function (dot, i) {
      dot.addEventListener('click', function () {
        stop();
        show(i);
        start();
      });
    });

    figure.addEventListener('mouseenter', stop);
    figure.addEventListener('mouseleave', start);
    figure.addEventListener('focusin', stop);
    figure.addEventListener('focusout', start);

    show(0);

    // Hold the rotation until the section is actually on screen.
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) start();
          else stop();
        });
      }, { threshold: 0.25 });
      io.observe(figure);
    } else {
      start();
    }
  }

  /* Horizontal rails ----------------------------------------------------- */

  function initRails() {
    $$('[data-rail]').forEach(function (wrap) {
      var rail = $('.rail', wrap);
      var prev = $('[data-rail-prev]', wrap);
      var next = $('[data-rail-next]', wrap);
      if (!rail) return;

      var step = function () {
        var first = rail.firstElementChild;
        if (!first) return rail.clientWidth * 0.8;
        var gap = parseFloat(getComputedStyle(rail).columnGap) || 0;
        return first.getBoundingClientRect().width + gap;
      };

      var sync = function () {
        var max = rail.scrollWidth - rail.clientWidth - 1;
        if (prev) prev.disabled = rail.scrollLeft <= 0;
        if (next) next.disabled = rail.scrollLeft >= max;
      };

      var go = function (dir) {
        rail.scrollBy({
          left: dir * step(),
          behavior: reduceMotion ? 'auto' : 'smooth'
        });
      };

      if (prev) prev.addEventListener('click', function () { go(-1); });
      if (next) next.addEventListener('click', function () { go(1); });

      rail.addEventListener('scroll', sync, { passive: true });
      window.addEventListener('resize', sync);
      sync();
    });
  }

  /* Pledge card ---------------------------------------------------------- */

  function initPledge() {
    var card = $('.pledge');
    if (!card) return;

    var toggle = $('.switch', card);
    var amount = $('#pledge-amount', card);
    var chips = $$('.chip', card);
    var labels = $$('.switch-label', card);

    if (toggle) {
      toggle.addEventListener('click', function () {
        var on = toggle.getAttribute('aria-checked') === 'true';
        toggle.setAttribute('aria-checked', String(!on));
        // labels[0] is the one-off option, labels[1] is monthly.
        if (labels.length === 2) {
          labels[0].classList.toggle('on', on);
          labels[1].classList.toggle('on', !on);
        }
      });
    }

    chips.forEach(function (chip) {
      chip.addEventListener('click', function () {
        chips.forEach(function (c) { c.classList.remove('is-active'); });
        chip.classList.add('is-active');
        if (amount) amount.value = chip.getAttribute('data-amount') || '';
      });
    });

    // Typing a custom figure clears any preset that no longer matches.
    if (amount) {
      amount.addEventListener('input', function () {
        chips.forEach(function (c) {
          c.classList.toggle('is-active', c.getAttribute('data-amount') === amount.value);
        });
      });
    }
  }

  /* Mailto forms --------------------------------------------------------- */
  /* There is no backend. Each form composes a message and hands it to the
     visitor's own mail client; the status line says so plainly. */

  function initMailForms() {
    $$('form[data-mailto]').forEach(function (form) {
      var status = $('.form-status', form);

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!form.reportValidity()) return;

        var to = form.getAttribute('data-mailto');
        var data = new FormData(form);
        var subject = form.getAttribute('data-subject') || 'Website enquiry';
        var lines = [];

        data.forEach(function (value, key) {
          if (key === '_subject') return;
          var text = String(value).trim();
          if (text) lines.push(key + ': ' + text);
        });

        var chosen = data.get('_subject');
        if (chosen) subject = String(chosen);

        window.location.href = 'mailto:' + to +
          '?subject=' + encodeURIComponent(subject) +
          '&body=' + encodeURIComponent(lines.join('\n'));

        if (status) status.hidden = false;
      });
    });
  }

  /* Boot ----------------------------------------------------------------- */

  function init() {
    initNav();
    initCurrent();
    initScrollProgress();
    initReveal();
    initImpact();
    initRails();
    initPledge();
    initMailForms();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
