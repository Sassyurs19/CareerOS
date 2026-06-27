/* ============================================================
   CareerOS — Animations Module
   - Scroll-reveal via IntersectionObserver
   - prefers-reduced-motion aware
   ============================================================ */
(function () {
  "use strict";

  var prefersReduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* ---------- Scroll-reveal via IntersectionObserver ---------- */
  var revealables = document.querySelectorAll(".reveal");

  if (prefersReduced || !("IntersectionObserver" in window)) {
    revealables.forEach(function (el) {
      el.classList.add("is-visible");
    });
  } else {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );
    revealables.forEach(function (el) {
      observer.observe(el);
    });

    /* Safety net: the loading overlay can sit above the page while the
       observer initialises. Once everything has loaded, force-reveal any
       element that is already within (or above) the viewport so the hero
       and other above-the-fold content can never stay stuck at opacity 0. */
    var revealVisible = function () {
      revealables.forEach(function (el) {
        if (el.classList.contains("is-visible")) return;
        var rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.92) {
          el.classList.add("is-visible");
          observer.unobserve(el);
        }
      });
    };
    if (document.readyState === "complete") {
      window.setTimeout(revealVisible, 200);
    } else {
      window.addEventListener("load", function () {
        window.setTimeout(revealVisible, 200);
      });
    }
  }
})();
