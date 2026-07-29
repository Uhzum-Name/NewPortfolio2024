/*
 * Vanilla-JS replacement for the jQuery-dependent bits of the old Webflow
 * export (webflow.js + inline per-page <script> blocks). GSAP, ScrollTrigger,
 * SplitType and Lenis are still loaded from their original CDNs in Layout.astro
 * -- only the jQuery glue code has been rewritten here.
 *
 * Reimplements:
 *   1. Lenis smooth scrolling.
 *   2. The "typewriter" char-stagger reveal on .navbar-label / .body-large / .label-final
 *      (was: SplitType + GSAP driven by jQuery selectors).
 *   3. The scroll-into-view fade/blur reveal that Webflow's IX2 engine drove via
 *      inline `style="opacity:0;filter:blur(20px)"` + compiled interaction JSON
 *      inside webflow.js. Reimplemented here with IntersectionObserver + CSS
 *      transitions (see the [data-reveal] rules in Layout.astro).
 *   4. The (currently hidden via CSS, .timezone{display:none}) NYC clock.
 */

(function () {
  // 1. Smooth scroll
  if (typeof Lenis !== 'undefined') {
    var lenis = new Lenis({
      lerp: 0.1,
      wheelMultiplier: 0.7,
      infinite: false,
      gestureOrientation: 'vertical',
      normalizeWheel: false,
      smoothTouch: false,
    });
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
  }

  // 2. Typewriter char-stagger reveal
  document.addEventListener('DOMContentLoaded', function () {
    var bodyEls = document.querySelectorAll('.body-large, .label-final');
    bodyEls.forEach(function (el) {
      el.setAttribute('data-text-split', '');
      el.setAttribute('data-typewriter', '');
    });

    var navEls = document.querySelectorAll('.navbar-label, .timezone-eua');
    navEls.forEach(function (el) {
      el.setAttribute('data-text-split', '');
      el.setAttribute('data-typewriter-navbar', '');
    });

    if (typeof SplitType !== 'undefined') {
      new SplitType('[data-text-split]', { types: 'words, chars', tagName: 'span' });
    }

    if (typeof gsap !== 'undefined') {
      document.querySelectorAll('[data-typewriter-navbar]').forEach(function (el) {
        var chars = el.querySelectorAll('.char');
        var tl = gsap.timeline();
        tl.set(el, { visibility: 'visible' });
        tl.from(chars, { opacity: 0, duration: 0.02, ease: 'none', stagger: { each: 0.08 } });
      });

      document.querySelectorAll('[data-typewriter]').forEach(function (el) {
        var chars = el.querySelectorAll('.char');
        // Cap the total reveal time regardless of text length: a 0.02s/char
        // stagger reads as a snappy typewriter for a short label, but takes
        // 12+ seconds to finish on a long testimonial paragraph. Short text
        // still gets the full 0.02s/char cascade; long text compresses the
        // stagger so the whole thing finishes within ~0.8s.
        var maxTotalDuration = 0.8;
        var perChar = chars.length ? Math.min(0.02, maxTotalDuration / chars.length) : 0.02;
        var tl = gsap.timeline({
          scrollTrigger: {
            trigger: el,
            start: 'top bottom',
            end: 'bottom top',
            toggleActions: 'play pause resume',
          },
        });
        tl.set(el, { visibility: 'visible' });
        tl.from(chars, { opacity: 0, duration: 0.02, ease: 'none', stagger: { each: perChar } });
      });
    }

    // 3. Scroll-into-view fade/blur reveal
    var revealEls = document.querySelectorAll('[data-reveal]');
    // For <img> elements, wait for the image itself to finish loading before
    // revealing it - otherwise the blur-to-clear transition can finish
    // playing while the image is still downloading/decoding, leaving a
    // blank flash mid-transition instead of a smooth reveal.
    function revealWhenReady(el) {
      if (el.tagName !== 'IMG') {
        el.classList.add('is-visible');
        return;
      }
      // decode() resolves once the bitmap is actually decoded and ready to
      // paint - complete/'load' alone can fire before that for large images
      // decoded off the main thread, leaving a blank flash mid-transition.
      if (el.decode) {
        el.decode().then(
          function () {
            el.classList.add('is-visible');
          },
          function () {
            el.classList.add('is-visible');
          }
        );
      } else if (el.complete) {
        el.classList.add('is-visible');
      } else {
        el.addEventListener('load', function () {
          el.classList.add('is-visible');
        });
        el.addEventListener('error', function () {
          el.classList.add('is-visible');
        });
      }
    }
    if ('IntersectionObserver' in window && revealEls.length) {
      var observer = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              revealWhenReady(entry.target);
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1, rootMargin: '0px 0px -10% 0px' }
      );
      revealEls.forEach(function (el) {
        observer.observe(el);
      });
    } else {
      revealEls.forEach(revealWhenReady);
    }

    // 4. NYC clock (kept for parity; .timezone is display:none in CSS today)
    var timezones = { 'timezone-eua': 'America/New_York' };
    function getFormattedTime(timezone) {
      var date = new Date();
      var options = { timeZone: timezone, hour12: false, hour: 'numeric', minute: 'numeric', second: 'numeric' };
      var locale = Intl.DateTimeFormat().resolvedOptions().locale;
      if (locale === 'pt-BR') options.hour12 = true;
      return date.toLocaleTimeString(locale, options);
    }
    function updateClocks() {
      Object.keys(timezones).forEach(function (tz) {
        var el = document.querySelector('.' + tz);
        if (el) el.textContent = getFormattedTime(timezones[tz]);
      });
    }
    setInterval(updateClocks, 1000);
    updateClocks();
  });
})();
