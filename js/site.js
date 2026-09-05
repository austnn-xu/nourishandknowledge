(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  /* Throttle a callback to one run per animation frame. */
  function onFrame(fn) {
    var queued = false;
    return function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () {
        queued = false;
        fn();
      });
    };
  }

  ready(function () {
    /* ----- Active navigation link ----- */
    var here = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.site-nav a').forEach(function (link) {
      if (link.getAttribute('href') === here) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
    });

    /* ----- Mobile navigation ----- */
    var toggle = document.querySelector('.nav-toggle');
    if (toggle) {
      var closeNav = function (refocus) {
        if (!document.body.classList.contains('nav-open')) return;
        document.body.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
        if (refocus) toggle.focus();
      };

      toggle.addEventListener('click', function () {
        var open = document.body.classList.toggle('nav-open');
        toggle.setAttribute('aria-expanded', String(open));
      });

      document.querySelectorAll('.site-nav a').forEach(function (link) {
        link.addEventListener('click', function () { closeNav(false); });
      });

      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeNav(true);
      });

      /* Tapping outside the sheet closes it. */
      document.addEventListener('click', function (e) {
        if (!document.body.classList.contains('nav-open')) return;
        if (e.target.closest('.site-nav') || e.target.closest('.nav-toggle')) return;
        closeNav(false);
      });
    }

    /* ----- Header condenses, progress pill fills ----- */
    var head = document.querySelector('.site-head');
    var progress = document.querySelector('.progress');
    var toTop = document.querySelector('.to-top');

    if (head || progress || toTop) {
      var paint = onFrame(function () {
        var doc = document.documentElement;
        var y = window.scrollY;
        var max = doc.scrollHeight - window.innerHeight;
        var ratio = max > 0 ? Math.min(y / max, 1) : 0;

        if (head) head.classList.toggle('head-scrolled', y > 12);
        if (progress) progress.style.transform = 'scaleX(' + ratio.toFixed(4) + ')';
        if (toTop) toTop.classList.toggle('show', y > window.innerHeight * 0.75);
      });
      window.addEventListener('scroll', paint, { passive: true });
      window.addEventListener('resize', paint);
      paint();
    }

    if (toTop) {
      toTop.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
      });
    }

    /* ----- Wrap masked headings so they can rise into view ----- */
    document.querySelectorAll('.mask').forEach(function (el) {
      var line = document.createElement('span');
      line.className = 'line';
      var inner = document.createElement('span');
      inner.innerHTML = el.innerHTML;
      line.appendChild(inner);
      el.innerHTML = '';
      el.appendChild(line);
      el.classList.add('reveal-mask');
    });

    buildLightbox();

    if (reduced || !('IntersectionObserver' in window)) {
      document.querySelectorAll('.mask, .reveal-mask').forEach(function (el) {
        el.classList.add('in');
      });
      document.querySelectorAll('[data-to]').forEach(function (el) {
        el.textContent = el.dataset.display || el.textContent;
      });
      return;
    }

    /* ----- Reveal on scroll ----- */
    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        revealer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    var solo = [
      '.page-head-copy > *',
      '.page-head > .photo',
      '.section-head',
      '.statement',
      '.band',
      '.split > *',
      '.prose > *',
      '.marquee',
      '.stitch'
    ].join(',');

    document.querySelectorAll(solo).forEach(function (el) {
      if (el.classList.contains('reveal-mask')) {
        revealer.observe(el);
        return;
      }
      el.classList.add('reveal');
      revealer.observe(el);
    });

    document.querySelectorAll('.reveal-mask').forEach(function (el) {
      revealer.observe(el);
    });

    /* Staggered groups: each child trails the one before it. */
    var groups = '.grid, .stats, .offer, .team, .contact-list, .gallery, .references';
    document.querySelectorAll(groups).forEach(function (group) {
      Array.prototype.forEach.call(group.children, function (child, i) {
        child.classList.add('reveal');
        child.style.transitionDelay = Math.min(i * 0.08, 0.48) + 's';
        revealer.observe(child);
      });
    });

    /* ----- Counting statistics ----- */
    var counters = document.querySelectorAll('[data-to]');
    if (counters.length) {
      var countIn = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          countIn.unobserve(entry.target);
          count(entry.target);
        });
      }, { threshold: 0.4 });
      counters.forEach(function (el) { countIn.observe(el); });
    }

    function count(el) {
      var target = parseFloat(el.dataset.to);
      var decimals = parseInt(el.dataset.decimals || '0', 10);
      var prefix = el.dataset.prefix || '';
      var suffix = el.dataset.suffix || '';
      var duration = 1600;
      var start = null;

      function step(now) {
        if (start === null) start = now;
        var t = Math.min((now - start) / duration, 1);
        var eased = 1 - Math.pow(1 - t, 3);
        var value = target * eased;
        el.textContent = prefix + value.toLocaleString('en-US', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        }) + suffix;
        if (t < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    if (!fine) return;

    /* ----- Buttons lean toward the cursor ----- */
    document.querySelectorAll('.btn').forEach(function (btn) {
      btn.addEventListener('pointermove', function (e) {
        var box = btn.getBoundingClientRect();
        var x = (e.clientX - box.left - box.width / 2) * 0.14;
        var y = (e.clientY - box.top - box.height / 2) * 0.2;
        btn.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
      });
      btn.addEventListener('pointerleave', function () { btn.style.transform = ''; });
    });

    /* ----- Clay cards tip slightly toward the cursor ----- */
    document.querySelectorAll('.card, .stat, .team-member').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var box = card.getBoundingClientRect();
        var rx = ((e.clientY - box.top) / box.height - 0.5) * -5;
        var ry = ((e.clientX - box.left) / box.width - 0.5) * 5;
        card.style.transform =
          'perspective(760px) translateY(-8px) rotateX(' + rx.toFixed(2) +
          'deg) rotateY(' + ry.toFixed(2) + 'deg)';
      });
      card.addEventListener('pointerleave', function () { card.style.transform = ''; });
    });
  });

  /* ---------------------------------------------------------
     Lightbox for the photo galleries
     --------------------------------------------------------- */

  function buildLightbox() {
    var shots = Array.prototype.slice.call(document.querySelectorAll('.shot'));
    if (!shots.length) return;

    var box = document.createElement('div');
    box.className = 'lightbox';
    box.setAttribute('role', 'dialog');
    box.setAttribute('aria-modal', 'true');
    box.setAttribute('aria-label', 'Photo viewer');
    box.innerHTML =
      '<div class="lightbox-frame">' +
        '<img alt="">' +
        '<p class="lightbox-cap"></p>' +
        '<button class="lb-btn lb-close" type="button" aria-label="Close">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>' +
        '</button>' +
        '<button class="lb-btn lb-prev" type="button" aria-label="Previous photo">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>' +
        '</button>' +
        '<button class="lb-btn lb-next" type="button" aria-label="Next photo">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>' +
        '</button>' +
      '</div>';
    document.body.appendChild(box);

    var img = box.querySelector('img');
    var cap = box.querySelector('.lightbox-cap');
    var frame = box.querySelector('.lightbox-frame');
    var btnClose = box.querySelector('.lb-close');
    var btnPrev = box.querySelector('.lb-prev');
    var btnNext = box.querySelector('.lb-next');
    var index = 0;
    var opener = null;

    var single = shots.length < 2;
    btnPrev.hidden = single;
    btnNext.hidden = single;

    function show(i) {
      index = (i + shots.length) % shots.length;
      var shot = shots[index];
      var thumb = shot.querySelector('img');
      img.src = shot.dataset.full || thumb.src;
      img.alt = thumb.alt;
      cap.textContent = shot.dataset.caption || thumb.alt;
    }

    function open(i, from) {
      opener = from;
      show(i);
      box.classList.add('open');
      document.body.style.overflow = 'hidden';
      btnClose.focus();
    }

    function close() {
      box.classList.remove('open');
      document.body.style.overflow = '';
      if (opener) opener.focus();
    }

    shots.forEach(function (shot, i) {
      shot.addEventListener('click', function () { open(i, shot); });
    });

    btnClose.addEventListener('click', close);
    btnPrev.addEventListener('click', function () { show(index - 1); });
    btnNext.addEventListener('click', function () { show(index + 1); });

    box.addEventListener('click', function (e) {
      if (!frame.contains(e.target)) close();
    });

    document.addEventListener('keydown', function (e) {
      if (!box.classList.contains('open')) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft' && !single) show(index - 1);
      else if (e.key === 'ArrowRight' && !single) show(index + 1);
      else if (e.key === 'Tab') {
        /* Keep focus inside the dialog while it is open. */
        var focusable = Array.prototype.filter.call(
          box.querySelectorAll('button'),
          function (b) { return !b.hidden; }
        );
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    });
  }
})();
