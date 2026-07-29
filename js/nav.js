document.addEventListener('DOMContentLoaded', function () {
  /* Highlight the active nav link */
  var path = window.location.pathname.split('/').pop() || 'index.html';
  var links = document.querySelectorAll('nav ul li a');
  links.forEach(function (link) {
    if (link.getAttribute('href') === path) {
      link.classList.add('active');
    }
  });

  /* Reveal-on-scroll animations */
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce || !('IntersectionObserver' in window)) return;

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });

  var selectors = [
    '.page-head',
    '.section > h2',
    '.section > .lead',
    '.band',
    '.mission-intro',
    '.team-member',
    '.references',
    '.prose',
    '.intro-lead',
    '.intro .hero-actions'
  ];
  document.querySelectorAll(selectors.join(',')).forEach(function (el) {
    el.classList.add('reveal');
    io.observe(el);
  });

  /* Staggered reveal for cards within each grid */
  document.querySelectorAll('.card-grid').forEach(function (grid) {
    Array.prototype.forEach.call(grid.children, function (card, i) {
      card.classList.add('reveal');
      card.style.transitionDelay = (i * 0.08) + 's';
      io.observe(card);
    });
  });
});
