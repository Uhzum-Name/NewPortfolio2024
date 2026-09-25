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

    // Every scroll-triggered typewriter timeline, so the "settle" pass below
    // can finish any that a reload / scroll-restore left half-played.
    var typewriters = [];

    if (typeof gsap !== 'undefined' && typeof SplitType !== 'undefined') {
      if (typeof ScrollTrigger !== 'undefined' && gsap.registerPlugin) {
        gsap.registerPlugin(ScrollTrigger);
      }

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
        // 'play none none none': once the text has entered the viewport it
        // always plays through to the end. (It used to be 'play pause resume'.
        // After a reload mid-page the browser restores the scroll position and
        // the page height shifts as images load, so a trigger could fire
        // "enter" then "leave" straight away and freeze the text half-typed,
        // e.g. "NEXT P".)
        var tl = gsap.timeline({
          scrollTrigger: {
            trigger: el,
            start: 'top bottom',
            end: 'bottom top',
            toggleActions: 'play none none none',
          },
        });
        tl.set(el, { visibility: 'visible' });
        tl.from(chars, { opacity: 0, duration: 0.02, ease: 'none', stagger: { each: perChar } });
        typewriters.push({ el: el, tl: tl });
      });
    } else {
      // GSAP / SplitType didn't load (blocked CDN, offline): never leave the
      // text hidden waiting for an animation that will not run.
      document.querySelectorAll('[data-text-split]').forEach(function (el) {
        el.style.visibility = 'visible';
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

    // Settle pass. After a reload the browser restores the previous scroll
    // position while the page is still laying out (lazy images have no height
    // yet, fonts swap), so scroll-triggered state can be computed against the
    // wrong positions. Re-measure once things have loaded, then make sure
    // nothing that is on screen (or already scrolled past) is left hidden or
    // half-animated.
    var vhNow = function () {
      return window.innerHeight || document.documentElement.clientHeight;
    };
    function settle() {
      var vh = vhNow();
      typewriters.forEach(function (t) {
        if (t.tl.progress() >= 1) return;
        var r = t.el.getBoundingClientRect();
        var pos = getComputedStyle(t.el).position;
        if (r.bottom < 0) {
          t.tl.progress(1); // already scrolled past: just finish it
        } else if (r.top < vh || pos === 'fixed' || pos === 'sticky') {
          t.tl.play(); // on screen: let it type out
        }
      });
      revealEls.forEach(function (el) {
        if (el.classList.contains('is-visible')) return;
        if (el.getBoundingClientRect().top < vh * 0.9) {
          if ('IntersectionObserver' in window && typeof observer !== 'undefined') observer.unobserve(el);
          revealWhenReady(el);
        }
      });
    }
    var refreshTimer;
    function refreshLayout() {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(function () {
        if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
        settle();
      }, 150);
    }
    // Late-loading images/fonts change the page height: re-measure after each.
    document.querySelectorAll('img').forEach(function (img) {
      if (!img.complete) img.addEventListener('load', refreshLayout, { once: true });
    });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refreshLayout);
    window.addEventListener('load', function () {
      refreshLayout();
      setTimeout(settle, 800);
      setTimeout(settle, 2000);
    });
    // Back/forward cache restores skip DOMContentLoaded and load entirely.
    window.addEventListener('pageshow', function (e) {
      if (e.persisted) refreshLayout();
    });
    // Cheap safety net while scrolling: catches anything the observers missed.
    var scrollTimer;
    window.addEventListener(
      'scroll',
      function () {
        clearTimeout(scrollTimer);
        scrollTimer = setTimeout(settle, 200);
      },
      { passive: true }
    );

    // Background videos: make sure they actually play (autoplay can silently
    // stall after a reload mid-page) and pause when off screen.
    var videos = document.querySelectorAll('video');
    if (videos.length) {
      var playVideo = function (v) {
        v.muted = true;
        var p = v.play();
        if (p && p.catch) p.catch(function () {});
      };
      if ('IntersectionObserver' in window) {
        var videoObserver = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (entry) {
              if (entry.isIntersecting) playVideo(entry.target);
              else entry.target.pause();
            });
          },
          { threshold: 0.05 }
        );
        videos.forEach(function (v) {
          videoObserver.observe(v);
        });
      } else {
        videos.forEach(playVideo);
      }
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
