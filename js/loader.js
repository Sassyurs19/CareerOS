/* ============================================================
   CareerOS — Loader Module
   - Small CareerOS logo (no box) + live percentage counter
   - Injected on every page, then fades out
   - Reduced-motion friendly
   ============================================================ */
(function () {
  "use strict";
  if (document.getElementById("careerLoader")) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Minimal CareerOS loader: the logo mark fills left→right in the brand
     accent, then the "CareerOS" wordmark fades in. No spinner, no percentage,
     no rotating taglines. Total ≈ 1000ms (≈500ms when reduced motion). */
  var loader = document.createElement("div");
  loader.className = "loaderx";
  loader.id = "careerLoader";
  loader.setAttribute("role", "status");
  loader.setAttribute("aria-label", "Loading CareerOS");
  loader.innerHTML =
    '<div class="loaderx__core">' +
      '<svg class="loaderx__logo" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
        '<path class="loaderx__track" d="M3.5 16.5 L9.5 10 L13.5 13 L20.5 5" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path class="loaderx__draw" d="M3.5 16.5 L9.5 10 L13.5 13 L20.5 5" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<circle class="loaderx__dot" cx="20.5" cy="5" r="2"/>' +
      '</svg>' +
      '<div class="loaderx__word">CareerOS</div>' +
    '</div>';

  var style = document.createElement("style");
  style.id = "loaderxStyle";
  style.textContent = [
    '.loaderx{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:#ffffff;transition:opacity .45s ease;}',
    '.loaderx.is-hidden{opacity:0;pointer-events:none;}',
    '.loaderx__core{display:flex;flex-direction:column;align-items:center;gap:14px;}',
    '.loaderx__logo{width:64px;height:64px;}',
    '.loaderx__track{stroke:rgba(0,0,0,.14);}',
    '.loaderx__draw{stroke:var(--accent,#000000);stroke-dasharray:28;stroke-dashoffset:28;}',
    '.loaderx__dot{fill:var(--accent,#000000);opacity:0;}',
    '.loaderx__word{font-family:inherit;font-weight:700;letter-spacing:.04em;font-size:20px;color:var(--accent,#000000);opacity:0;}',
    '@keyframes lx-draw{to{stroke-dashoffset:0;}}',
    '@keyframes lx-fade{to{opacity:1;}}',
    '.loaderx:not(.reduced) .loaderx__draw{animation:lx-draw .6s ease forwards;}',
    '.loaderx:not(.reduced) .loaderx__dot{animation:lx-fade .25s ease .55s forwards;}',
    '.loaderx:not(.reduced) .loaderx__word{animation:lx-fade .35s ease .6s forwards;}',
    '.loaderx.reduced .loaderx__draw{stroke-dashoffset:0;}',
    '.loaderx.reduced .loaderx__dot,.loaderx.reduced .loaderx__word{opacity:1;}'
  ].join("");

  function mount() {
    if (reduce) loader.classList.add("reduced");
    document.head.appendChild(style);
    document.body.appendChild(loader);
    document.body.style.overflow = "hidden";

    var hold = reduce ? 500 : 1050;
    window.setTimeout(function () {
      loader.classList.add("is-hidden");
      document.body.style.overflow = "";
      window.setTimeout(function () {
        if (loader.parentNode) loader.parentNode.removeChild(loader);
        if (style.parentNode) style.parentNode.removeChild(style);
      }, 480);
    }, hold);
  }

  if (document.body) {
    mount();
  } else {
    document.addEventListener("DOMContentLoaded", mount);
  }
})();
