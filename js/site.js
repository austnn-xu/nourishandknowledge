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
      toggle.addEventListener('click', function () {
        var open = document.body.classList.toggle('nav-open');
        toggle.setAttribute('aria-expanded', String(open));
      });
      document.querySelectorAll('.site-nav a').forEach(function (link) {
        link.addEventListener('click', function () {
          document.body.classList.remove('nav-open');
          toggle.setAttribute('aria-expanded', 'false');
        });
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && document.body.classList.contains('nav-open')) {
          document.body.classList.remove('nav-open');
          toggle.setAttribute('aria-expanded', 'false');
          toggle.focus();
        }
      });
    }

    /* ----- Reading progress hairline ----- */
    var progress = document.querySelector('.progress');
    if (progress) {
      var paint = onFrame(function () {
        var doc = document.documentElement;
        var max = doc.scrollHeight - window.innerHeight;
        var ratio = max > 0 ? Math.min(window.scrollY / max, 1) : 0;
        progress.style.transform = 'scaleX(' + ratio.toFixed(4) + ')';
      });
      window.addEventListener('scroll', paint, { passive: true });
      window.addEventListener('resize', paint);
      paint();
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
      '.page-head > *',
      '.section-head',
      '.statement',
      '.band',
      '.split',
      '.prose > *',
      '.references',
      '.marquee'
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
    document.querySelectorAll('.grid, .stats, .offer, .team, .contact-list').forEach(function (group) {
      Array.prototype.forEach.call(group.children, function (child, i) {
        child.classList.add('reveal');
        child.style.transitionDelay = Math.min(i * 0.09, 0.5) + 's';
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
      counters.forEach(function (el) {
        countIn.observe(el);
      });
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

    /* ----- Hero table drifts and fades as the page scrolls ----- */
    var table = document.querySelector('.hero-table');
    var hero = document.querySelector('.hero');
    if (table && hero) {
      var drift = onFrame(function () {
        var h = hero.offsetHeight || 1;
        var p = Math.min(Math.max(window.scrollY / h, 0), 1);
        table.style.transform =
          'translate(-50%, calc(-50% + ' + (p * 90).toFixed(1) + 'px)) scale(' + (1 + p * 0.12).toFixed(3) + ')';
        table.style.opacity = String(Math.max(1 - p * 1.25, 0));
      });
      window.addEventListener('scroll', drift, { passive: true });
      drift();
    }

    /* ----- Buttons lean toward the cursor ----- */
    if (fine) {
      document.querySelectorAll('.btn').forEach(function (btn) {
        btn.addEventListener('pointermove', function (e) {
          var box = btn.getBoundingClientRect();
          var x = (e.clientX - box.left - box.width / 2) * 0.16;
          var y = (e.clientY - box.top - box.height / 2) * 0.22;
          btn.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px)';
        });
        btn.addEventListener('pointerleave', function () {
          btn.style.transform = '';
        });
      });
    }
  });
})();
