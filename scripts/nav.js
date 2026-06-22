// Mobile-nav hamburger toggle. Served as an external file (referenced with
// `is:inline src`) so it satisfies a strict `script-src 'self'` — the site
// ships no inline executable scripts. See docs/deploy.md.
const burger = document.getElementById('nav-burger');
const mobileNav = document.getElementById('mobile-nav');

burger?.addEventListener('click', () => {
  const open = burger.getAttribute('aria-expanded') === 'true';
  burger.setAttribute('aria-expanded', String(!open));
  burger.setAttribute('aria-label', open ? 'Open navigation' : 'Close navigation');
  if (mobileNav) {
    mobileNav.setAttribute('aria-hidden', String(open));
    mobileNav.classList.toggle('mobile-nav--open', !open);
  }
});
