/* ============================================================
   CareerOS — Theme Module
   - Theme management (dark/light mode, preferences)
   - Design token management
   ============================================================ */
(function () {
  "use strict";

  var CareerOS = (window.CareerOS = window.CareerOS || {});

  CareerOS.theme = {
    /* Get current theme preference */
    get: function () {
      try {
        return localStorage.getItem("careeros.theme") || "dark";
      } catch (e) {
        return "dark";
      }
    },

    /* Set theme preference */
    set: function (theme) {
      try {
        localStorage.setItem("careeros.theme", theme);
        document.documentElement.setAttribute("data-theme", theme);
      } catch (e) {}
    },

    /* Initialize theme on page load */
    init: function () {
      var theme = this.get();
      document.documentElement.setAttribute("data-theme", theme);
    }
  };

  // Initialize theme immediately
  CareerOS.theme.init();
})();
