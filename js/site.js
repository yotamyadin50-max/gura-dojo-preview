/* Gura Dojo: one script for / and /en/. Every feature degrades to plain anchors without JS. */
(function () {
  'use strict';
  var doc = document;
  var root = doc.documentElement;
  var started = false;

  function start() {
    if (started) return;
    started = true;
    root.classList.add('js');
    window.setTimeout(warmPhotos, 150);
    stagePosters();
    stageVideos();
    var header = doc.querySelector('.site-header');
    var chips = Array.prototype.slice.call(doc.querySelectorAll('.chip'));
    var toggles = Array.prototype.slice.call(doc.querySelectorAll('[data-toggle]'));
    var fab = doc.querySelector('.fab');
    /* nav edge fade only while the chip row really overflows and is not scrolled to its end */
    (function () {
      var nav = doc.querySelector('.hdr-nav'), row = nav && nav.querySelector('.chips');
      if (!row) return;
      function fade() { var more = Math.abs(row.scrollLeft) + row.clientWidth < row.scrollWidth - 2; if (more) nav.setAttribute('data-fade', ''); else nav.removeAttribute('data-fade'); }
      row.addEventListener('scroll', fade, { passive: true }); window.addEventListener('resize', fade); window.addEventListener('load', fade); if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(fade); fade();
    })();
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var vh = window.innerHeight || 800;

    /* smooth scrolling only for in-page anchor jumps, and only when motion is welcome */
    if (!reduce) {
      doc.addEventListener('click', function (e) {
        var a = e.target.closest ? e.target.closest('a[href^="#"]') : null;
        if (!a) return;
        root.setAttribute('data-smooth', '');
        window.setTimeout(function () { root.removeAttribute('data-smooth'); }, 1200);
      });
    }

    /* header row 2: hide on scroll down, return on scroll up (row 1 never hides) */
    if (header) {
      var lastY = window.scrollY || 0;
      var ticking = false;
      window.addEventListener('scroll', function () {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(function () {
          var y = window.scrollY || 0;
          var d = y - lastY;
          if (y < 80) header.classList.remove('nav-hidden');
          else if (d > 6) header.classList.add('nav-hidden');
          else if (d < -6) header.classList.remove('nav-hidden');
          if (Math.abs(d) > 6) lastY = y;
          ticking = false;
        });
      }, { passive: true });
    }

    /* section in view: chip aria-current and section-aware language toggle */
    var ids = ['hero', 'movement', 'class', 'about', 'guy', 'dojo', 'contact'];
    var current = '';
    function setCurrent(id) {
      current = id;
      chips.forEach(function (c) {
        var on = c.getAttribute('href') === '#' + id;
        if (on) c.setAttribute('aria-current', 'true'); else c.removeAttribute('aria-current');
        if (on) {
          var sc = c.closest('.chips');
          var a = c.getBoundingClientRect(), b = sc.getBoundingClientRect();
          if (a.right > b.right) sc.scrollLeft += a.right - b.right + 8;
          else if (a.left < b.left) sc.scrollLeft -= b.left - a.left + 8;
        }
      });
      toggles.forEach(function (t) {
        var base = t.getAttribute('data-base');
        if (!base) { base = t.getAttribute('href').split('#')[0]; t.setAttribute('data-base', base); }
        t.setAttribute('href', base + (id && id !== 'hero' ? '#' + id : ''));
      });
    }
    if (!('IntersectionObserver' in window)) root.removeAttribute('data-top');
    if ('IntersectionObserver' in window) {
      var seen = {};
      var secObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { seen[e.target.id] = e.isIntersecting; });
        var hit = '';
        ids.forEach(function (id) { if (seen[id]) hit = id; });
        setCurrent(hit);
      }, { rootMargin: '-35% 0px -64% 0px', threshold: 0 });
      ids.forEach(function (id) { var el = doc.getElementById(id); if (el) secObs.observe(el); });

      /* floating WhatsApp button: hidden while the hero, mid or contact CTA is on screen */
      if (fab) {
        var onScreen = {};
        var pill = doc.querySelector('.site-header .cta--pill');
        var ctaObs = new IntersectionObserver(function (entries) {
          entries.forEach(function (e) { onScreen[e.target.getAttribute('data-cta')] = e.isIntersecting; });
          var any = Object.keys(onScreen).some(function (k) { return onScreen[k]; });
          fab.classList.toggle('is-hidden', any);
          if (pill) pill.classList.toggle('is-hidden', any);
          root.removeAttribute('data-top');
        }, { threshold: 0 });
        Array.prototype.forEach.call(doc.querySelectorAll('[data-cta]'), function (el) { ctaObs.observe(el); });
      }

      /* entrance: only items below the first screen are marked, and revealed once */
      var revObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.setAttribute('data-rv', 'in'); revObs.unobserve(e.target); }
        });
      }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
      Array.prototype.forEach.call(doc.querySelectorAll('.rv'), function (el) {
        var r = el.getBoundingClientRect();
        if (r.top > vh) { el.setAttribute('data-rv', 'pre'); revObs.observe(el); }
      });
      /* a fast scroll can jump past an item between frames: reveal everything now above the fold line */
      var passTick = false;
      window.addEventListener('scroll', function () {
        if (passTick) return;
        passTick = true;
        window.requestAnimationFrame(function () {
          Array.prototype.forEach.call(doc.querySelectorAll('[data-rv="pre"]'), function (el) {
            if (el.getBoundingClientRect().top < (window.innerHeight || vh) * 0.88) { el.setAttribute('data-rv', 'in'); revObs.unobserve(el); }
          });
          passTick = false;
        });
      }, { passive: true });
    }
  }

  /* Stage clips: run by themselves, muted and looping, no controls. The mp4 is attached only near the viewport and only when
     motion and data are welcome; paused when far away to spare battery. Any failure leaves the poster as an ordinary photo. */
  /* posters are not loaded with the page: each is set from data-poster when its clip slot is within 800px of the viewport (all at once without IntersectionObserver); no-JS visitors see the <noscript> image instead */
  function stagePosters() {
    var vids = Array.prototype.slice.call(doc.querySelectorAll('video[data-poster]'));
    function set(v) { if (!v.getAttribute('poster')) v.setAttribute('poster', v.getAttribute('data-poster')); }
    if (!('IntersectionObserver' in window)) { vids.forEach(set); return; }
    var po = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { set(e.target); po.unobserve(e.target); } });
    }, { rootMargin: '800px 0px' });
    vids.forEach(function (v) { po.observe(v); });
  }

  function stageVideos() {
    var vids = Array.prototype.slice.call(doc.querySelectorAll('video[data-src]'));
    if (!vids.length) return;
    var c = navigator.connection;
    var calm = (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) || (c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || '')));
    if (calm || !('IntersectionObserver' in window)) { vids.forEach(function (v) { v.removeAttribute('autoplay'); }); return; }
    function play(v) {
      if (!v.getAttribute('src')) { v.src = v.getAttribute('data-src'); v.load(); }
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    }
    vids.forEach(function (v) {
      v.muted = true;
      v.addEventListener('error', function () { v.removeAttribute('src'); v.load(); io.unobserve(v); });
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) play(e.target);
        else if (e.target.getAttribute('src')) e.target.pause();
      });
    }, { rootMargin: '200px 0px' });
    vids.forEach(function (v) { io.observe(v); });
  }

  /* After the page has loaded, warm the below-the-fold photos at low priority so they are already there when scrolled to
     (native lazy loading stays the default; skipped on data-saver and 2g so nobody pays for photos they may never reach). */
  function warmPhotos() {
    var c = navigator.connection;
    if (c && (c.saveData || /(^|-)2g$/.test(c.effectiveType || ''))) return;
    Array.prototype.forEach.call(doc.querySelectorAll('img[loading="lazy"]'), function (img) {
      if (img.closest('video')) return;
      img.setAttribute('fetchpriority', 'low');
      img.loading = 'eager';
    });
  }

  if (doc.readyState === 'complete') start();
  else window.addEventListener('load', start);
  // phone header: the small emblem hides while the hero (with the big emblem) is on screen
  (function () {
    var hero = document.getElementById('hero');
    if (!hero || !('IntersectionObserver' in window)) return;
    new IntersectionObserver(function (es) { document.documentElement.toggleAttribute('data-hero', es[0].isIntersecting); }, { threshold: 0.35 }).observe(hero);
  })();
})();
