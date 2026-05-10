/**
 * Street Food Vla — JS public
 * Animations subtiles + interactions UI mobile-first.
 */

(function () {
  'use strict';

  const isMobile = window.matchMedia('(max-width: 719px)');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ─── REVEAL ON SCROLL ────────────────────────────────────────────────────
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach((el) => observer.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  // ─── HEADER + BOTTOM BAR : SCROLL STATE & AUTO-HIDE ──────────────────────
  const header = document.querySelector('[data-header]');
  const bottombar = document.querySelector('[data-mobile-bottombar]');
  let lastY = window.scrollY;
  let ticking = false;
  let scrolledDownPx = 0;

  const onScroll = () => {
    if (ticking) return;
    window.requestAnimationFrame(() => {
      const y = window.scrollY;
      const dy = y - lastY;

      // Header : ombrage scrolled
      if (header) {
        if (y > 20) header.classList.add('is-scrolled');
        else header.classList.remove('is-scrolled');
      }

      // Auto-hide header / bottombar au scroll vers le bas (mobile uniquement)
      if (isMobile.matches) {
        // Ignore les micro-mouvements (rebond iOS)
        if (Math.abs(dy) > 4) {
          if (dy > 0 && y > 120) {
            scrolledDownPx += dy;
            if (scrolledDownPx > 60) {
              if (header) header.classList.add('is-hidden');
              if (bottombar) bottombar.classList.add('is-hidden');
            }
          } else if (dy < 0) {
            scrolledDownPx = 0;
            if (header) header.classList.remove('is-hidden');
            if (bottombar) bottombar.classList.remove('is-hidden');
          }
        }
        // En haut de page, on remet tout
        if (y < 20) {
          if (header) header.classList.remove('is-hidden');
          if (bottombar) bottombar.classList.remove('is-hidden');
        }
      } else {
        // Desktop : tout est toujours visible
        if (header) header.classList.remove('is-hidden');
        if (bottombar) bottombar.classList.remove('is-hidden');
      }

      lastY = y;
      ticking = false;
    });
    ticking = true;
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ─── DRAWER MOBILE ──────────────────────────────────────────────────────
  const burger = document.querySelector('[data-burger]');
  const drawer = document.querySelector('[data-drawer]');

  // iOS-safe scroll lock : on fige le body en position:fixed et on restaure le
  // scroll après. `overflow:hidden` seul ne suffit pas sur iOS Safari.
  let lockedScrollY = 0;
  function lockBodyScroll() {
    lockedScrollY = window.scrollY || window.pageYOffset || 0;
    document.body.style.position = 'fixed';
    document.body.style.top = -lockedScrollY + 'px';
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
  }
  function unlockBodyScroll() {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    window.scrollTo(0, lockedScrollY);
  }

  function closeDrawer() {
    if (!drawer || !burger) return;
    drawer.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    burger.classList.remove('is-active');
    burger.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('is-drawer-open');
    unlockBodyScroll();
    // Rendre le focus au burger
    burger.focus({ preventScroll: true });
  }
  function openDrawer() {
    if (!drawer || !burger) return;
    lockBodyScroll();
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    burger.classList.add('is-active');
    burger.setAttribute('aria-expanded', 'true');
    document.body.classList.add('is-drawer-open');
    // S'assurer que le drawer est visible (cas où header avait été auto-caché)
    if (header) header.classList.remove('is-hidden');
    // Focus sur le premier lien pour les utilisateurs clavier / lecteur d'écran
    const firstLink = drawer.querySelector('a, button');
    if (firstLink) firstLink.focus({ preventScroll: true });
    // Reset scroll interne du drawer
    drawer.scrollTop = 0;
  }

  if (burger && drawer) {
    burger.addEventListener('click', () => {
      if (drawer.classList.contains('is-open')) closeDrawer();
      else openDrawer();
    });

    // Fermer en cliquant sur un lien
    drawer.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', closeDrawer);
    });

    // ESC pour fermer
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) closeDrawer();
    });

    // Fermer le drawer si on dépasse 720px (rotation tablette)
    window.addEventListener('resize', () => {
      if (!isMobile.matches && drawer.classList.contains('is-open')) closeDrawer();
    });
  }

  // ─── MENU CATEGORY NAV (sticky highlight + smooth scroll) ────────────────
  const catLinks = document.querySelectorAll('[data-cat-link]');
  const catSections = document.querySelectorAll('[data-cat]');

  if (catLinks.length && catSections.length) {
    catLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        const targetId = link.getAttribute('href');
        if (!targetId || !targetId.startsWith('#')) return;
        const target = document.querySelector(targetId);
        if (!target) return;
        e.preventDefault();
        // offset = header + sticky cat nav (varie mobile/desktop)
        const headerH = header ? header.getBoundingClientRect().height : 60;
        const catNav = link.closest('.menu-categories');
        const catNavH = catNav ? catNav.getBoundingClientRect().height : 0;
        const yOffset = -(headerH + catNavH + 12);
        const y = target.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: reduceMotion ? 'auto' : 'smooth' });
      });
    });

    if ('IntersectionObserver' in window) {
      const linkBySlug = {};
      catLinks.forEach((l) => { linkBySlug[l.dataset.catLink] = l; });

      const catObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          const slug = entry.target.dataset.cat;
          const link = linkBySlug[slug];
          if (!link) return;
          if (entry.isIntersecting) {
            catLinks.forEach((l) => l.classList.remove('is-active'));
            link.classList.add('is-active');
            // Sur mobile, on fait scroller la nav pour garder l'élément visible
            if (isMobile.matches) {
              const navContainer = link.closest('.menu-categories');
              if (navContainer) {
                const navRect = navContainer.getBoundingClientRect();
                const linkRect = link.getBoundingClientRect();
                const offset = linkRect.left - navRect.left - 16;
                navContainer.scrollTo({ left: navContainer.scrollLeft + offset, behavior: reduceMotion ? 'auto' : 'smooth' });
              }
            }
          }
        });
      }, { rootMargin: '-30% 0px -55% 0px', threshold: 0 });

      catSections.forEach((sec) => catObserver.observe(sec));
    }
  }

  // ─── PARALLAX HERO (desktop seulement, et si motion OK) ──────────────────
  const heroVisual = document.querySelector('.hero-visual-frame');
  if (heroVisual && !reduceMotion && !isMobile.matches) {
    let ticking2 = false;
    const onScroll2 = () => {
      if (ticking2) return;
      window.requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y < 800) {
          heroVisual.style.transform = `rotate(${-1.5 + y * 0.005}deg) translateY(${y * 0.05}px)`;
        }
        ticking2 = false;
      });
      ticking2 = true;
    };
    window.addEventListener('scroll', onScroll2, { passive: true });
  }

  // ─── 100dvh fallback pour vieux Safari (corrige l'effet "barre URL") ─────
  // (Au cas où dvh n'est pas supporté, on injecte une variable --vh.)
  if (!CSS.supports('height', '100dvh')) {
    const setVh = () => {
      document.documentElement.style.setProperty('--vh', window.innerHeight * 0.01 + 'px');
    };
    setVh();
    window.addEventListener('resize', setVh, { passive: true });
    window.addEventListener('orientationchange', setVh, { passive: true });
  }

})();
