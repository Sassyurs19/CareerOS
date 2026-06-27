/* ============================================================
   CareerOS — Utilities Module
   - Helper functions used across modules
   ============================================================ */
(function () {
  "use strict";

  var CareerOS = (window.CareerOS = window.CareerOS || {});

  /* ---------- Escape HTML to prevent XSS ---------- */
  CareerOS.utils = {
    escape: function (s) {
      return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
      });
    },

    /* ---------- Check for reduced motion preference ---------- */
    prefersReducedMotion: function () {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    },

    /* ---------- Safe focus helper ---------- */
    safeFocus: function (el) {
      if (el && el.focus) {
        try {
          el.focus();
        } catch (e) {}
      }
    },

    /* ---------- Debounce function ---------- */
    debounce: function (func, wait) {
      var timeout;
      return function () {
        var context = this;
        var args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(function () {
          func.apply(context, args);
        }, wait);
      };
    }
  };
})();
