/**
 * L'Émulsion — JS public
 * Animations subtiles + interactions UI mobile-first.
 */

(function () {
  'use strict';

  const isMobile = window.matchMedia('(max-width: 719px)');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ─── REVEAL ON SCROLL ────────────────────────────────────────────────────
  const revealEls = document.querySelectorAll('.reveal, .reveal-fade, .reveal-rule');
  if ('IntersectionObserver' in window && revealEls.length) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach((el) => observer.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  // ─── HERO : marquage visible pour zoom out initial ───────────────────────
  const hero = document.querySelector('[data-hero]');
  if (hero) {
    // Léger délai pour orchestrer avec les fondus texte
    window.requestAnimationFrame(() => {
      setTimeout(() => hero.classList.add('is-visible'), 40);
    });
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

      if (header) {
        if (y > 20) header.classList.add('is-scrolled');
        else header.classList.remove('is-scrolled');
      }

      if (isMobile.matches) {
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
        if (y < 20) {
          if (header) header.classList.remove('is-hidden');
          if (bottombar) bottombar.classList.remove('is-hidden');
        }
      } else {
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
    if (header) header.classList.remove('is-hidden');
    const firstLink = drawer.querySelector('a, button');
    if (firstLink) firstLink.focus({ preventScroll: true });
    drawer.scrollTop = 0;
  }

  if (burger && drawer) {
    burger.addEventListener('click', () => {
      if (drawer.classList.contains('is-open')) closeDrawer();
      else openDrawer();
    });

    drawer.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', closeDrawer);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && drawer.classList.contains('is-open')) closeDrawer();
    });

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

  // ─── PARALLAX HERO ARTWORK (desktop seulement, motion OK) ────────────────
  const heroArtwork = document.querySelector('.hero-artwork img, .hero-artwork svg');
  const heroCornerNum = document.querySelector('.hero-corner-num');
  if (!reduceMotion && !isMobile.matches && (heroArtwork || heroCornerNum)) {
    let ticking2 = false;
    const onScroll2 = () => {
      if (ticking2) return;
      window.requestAnimationFrame(() => {
        const y = window.scrollY;
        if (y < window.innerHeight) {
          if (heroArtwork) heroArtwork.style.transform = `scale(1.02) translate3d(0, ${y * 0.28}px, 0)`;
          if (heroCornerNum) heroCornerNum.style.transform = `translate3d(0, ${y * 0.15}px, 0)`;
        }
        ticking2 = false;
      });
      ticking2 = true;
    };
    window.addEventListener('scroll', onScroll2, { passive: true });
    onScroll2();
  }

  // ─── COUNT-UP sur la note (démarre au reveal du hero) ────────────────────
  const ratingStrong = document.querySelector('.hero-rating strong');
  if (ratingStrong && !reduceMotion) {
    const finalText = ratingStrong.textContent.trim();  // "4.8/5"
    const match = finalText.match(/^(\d+([.,]\d+)?)/);
    if (match) {
      const finalValue = parseFloat(match[1].replace(',', '.'));
      const suffix = finalText.slice(match[1].length);
      const decimals = (match[1].split(/[.,]/)[1] || '').length;
      const duration = 1200;
      let started = false;
      const startCount = () => {
        if (started) return;
        started = true;
        const start = performance.now();
        const tick = (now) => {
          const t = Math.min(1, (now - start) / duration);
          // easeOutCubic
          const eased = 1 - Math.pow(1 - t, 3);
          const v = finalValue * eased;
          ratingStrong.textContent = v.toFixed(decimals) + suffix;
          if (t < 1) requestAnimationFrame(tick);
          else ratingStrong.textContent = finalText;
        };
        requestAnimationFrame(tick);
      };
      // Démarrer au chargement (le rating est dans le hero)
      setTimeout(startCount, 700);
    }
  }

  // ─── 100dvh fallback pour vieux Safari ───────────────────────────────────
  if (!CSS.supports('height', '100dvh')) {
    const setVh = () => {
      document.documentElement.style.setProperty('--vh', window.innerHeight * 0.01 + 'px');
    };
    setVh();
    window.addEventListener('resize', setVh, { passive: true });
    window.addEventListener('orientationchange', setVh, { passive: true });
  }

})();
