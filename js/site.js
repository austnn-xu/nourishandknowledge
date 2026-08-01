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

    var track = $('.impact-track');
    var index = -1;
    var counted = [];

    var show = function (next) {
      next = Math.max(0, Math.min(next, items.length - 1));
      if (next === index) return;
      index = next;

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

    show(0);
    if (!track) return;

    // Keeps the track length honest if a statistic is ever added or removed.
    track.style.setProperty('--steps', items.length);

    // How far the page scrolls while the stage is pinned.
    var runway = function () {
      return Math.max(track.offsetHeight - window.innerHeight, 1);
    };

    var queued = false;

    var update = function () {
      queued = false;
      var progress = -track.getBoundingClientRect().top / runway();
      var clamped = Math.min(Math.max(progress, 0), 0.999999);
      show(Math.floor(clamped * items.length));
      track.classList.toggle('is-final', index === items.length - 1);
    };

    var onScroll = function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    update();

    // Dots stay usable: each one scrolls to the middle of its slice of track.
    dots.forEach(function (dot, i) {
      dot.addEventListener('click', function () {
        var top = track.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({
          top: top + ((i + 0.5) / items.length) * runway(),
          behavior: reduceMotion ? 'auto' : 'smooth'
        });
      });
    });
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

  /* Mail ----------------------------------------------------------------- */
  /* There is no backend, so every route out of this site is a mailto:. That
     only works when the visitor's browser has a mail client registered, and
     on plenty of machines (Chrome with no handler set, a borrowed laptop, a
     locked-down school account) it silently does nothing at all. So we always
     offer webmail compose links and a copy button alongside it. */

  var MAIL_WAIT = 1500;

  function composeUrls(to, subject, body) {
    var e = encodeURIComponent;
    return {
      mailto: 'mailto:' + to + '?subject=' + e(subject) + '&body=' + e(body),
      gmail: 'https://mail.google.com/mail/u/0/?fs=1&tf=cm&to=' + e(to) +
        '&su=' + e(subject) + '&body=' + e(body),
      outlook: 'https://outlook.live.com/mail/0/deeplink/compose?to=' + e(to) +
        '&subject=' + e(subject) + '&body=' + e(body)
    };
  }

  /* Clipboard API needs a secure context; fall back to a scratch textarea. */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var pad = document.createElement('textarea');
      pad.value = text;
      pad.setAttribute('readonly', '');
      pad.style.cssText = 'position:fixed;top:0;left:0;opacity:0';
      document.body.appendChild(pad);
      pad.select();
      var done = false;
      try { done = document.execCommand('copy'); } catch (err) { done = false; }
      document.body.removeChild(pad);
      if (done) resolve(); else reject(new Error('copy failed'));
    });
  }

  function altLink(label, href) {
    var a = document.createElement('a');
    a.className = 'mail-alt-btn';
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = label;
    return a;
  }

  function copyButton(label, text) {
    var btn = document.createElement('button');
    btn.className = 'mail-alt-btn';
    btn.type = 'button';
    btn.textContent = label;
    btn.addEventListener('click', function () {
      copyText(text).then(function () {
        btn.textContent = 'Copied';
      }, function () {
        btn.textContent = 'Press Ctrl+C';
      });
      window.setTimeout(function () { btn.textContent = label; }, 2400);
    });
    return btn;
  }

  /* The row of "send it another way" actions shown under a submitted form. */
  function altActions(urls, transcript) {
    var row = document.createElement('div');
    row.className = 'mail-alt';
    row.appendChild(altLink('Open in Gmail', urls.gmail));
    row.appendChild(altLink('Open in Outlook', urls.outlook));
    row.appendChild(copyButton('Copy message', transcript));
    return row;
  }

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

        var body = lines.join('\n');
        var urls = composeUrls(to, subject, body);
        var transcript = 'To: ' + to + '\nSubject: ' + subject + '\n\n' + body;

        /* Show the alternatives first: if the mailto does take over, the
           visitor comes back to a page that already has them waiting. */
        if (status) {
          var stale = $('.mail-alt', status);
          if (stale) stale.parentNode.removeChild(stale);
          status.appendChild(altActions(urls, transcript));
          status.hidden = false;
        }

        window.location.href = urls.mailto;
      });
    });
  }

  /* Plain mailto: links (nav envelope, footer rows, the contact tile). We let
     the browser try first. If focus never leaves the page, nothing handled it,
     so offer the same alternatives in a dismissible card. */

  function initMailLinks() {
    var card = null;

    function dismiss() {
      if (!card) return;
      card.parentNode.removeChild(card);
      card = null;
    }

    function offer(to) {
      dismiss();
      var urls = composeUrls(to, 'Hello from the website', '');

      card = document.createElement('div');
      card.className = 'mail-toast';
      card.setAttribute('role', 'dialog');
      card.setAttribute('aria-label', 'Other ways to email us');

      var close = document.createElement('button');
      close.className = 'mail-toast-close';
      close.type = 'button';
      close.setAttribute('aria-label', 'Close');
      close.innerHTML = '&times;';
      close.addEventListener('click', dismiss);

      var text = document.createElement('p');
      text.textContent = 'No mail app opened on this device. You can write to us ' +
        'in the browser instead, or copy the address.';

      var row = document.createElement('div');
      row.className = 'mail-alt';
      row.appendChild(altLink('Open in Gmail', urls.gmail));
      row.appendChild(altLink('Open in Outlook', urls.outlook));
      row.appendChild(copyButton('Copy address', to));

      card.appendChild(close);
      card.appendChild(text);
      card.appendChild(row);
      document.body.appendChild(card);
      close.focus();
    }

    document.addEventListener('click', function (e) {
      var link = e.target && e.target.closest && e.target.closest('a[href^="mailto:"]');
      if (!link) return;

      var to = link.getAttribute('href').slice(7).split('?')[0];
      if (!to) return;

      window.setTimeout(function () {
        /* A mail client that opened steals focus, so a still-focused page
           means the click went nowhere. */
        if (document.hidden || !document.hasFocus()) return;
        offer(to);
      }, MAIL_WAIT);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') dismiss();
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
    initMailLinks();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
