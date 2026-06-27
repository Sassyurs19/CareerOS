/* ============================================================
   CareerOS — Navigation Module
   - Active nav highlighting
   - Marks the current page's nav link with .is-active + aria-current="page"
   - Generic: derives the current filename from pathname and matches link hrefs
   - Element-guarded; runs on every page
   ============================================================ */
(function () {
  "use strict";

  function currentFile() {
    var path = window.location.pathname;
    var file = path.substring(path.lastIndexOf("/") + 1);
    /* Treat a bare directory ("/" or "/careeros/") as index.html. */
    return file === "" ? "index.html" : file.toLowerCase();
  }

  function linkFile(href) {
    if (!href) return "";
    /* Ignore anchors, mailto, external and protocol-relative links. */
    if (/^(https?:|mailto:|tel:|#)/i.test(href)) return "";
    var clean = href.split("#")[0].split("?")[0];
    var file = clean.substring(clean.lastIndexOf("/") + 1);
    return file.toLowerCase();
  }

  function highlight() {
    var here = currentFile();
    var links = document.querySelectorAll(".nav__link, .mobile-menu__link");
    Array.prototype.forEach.call(links, function (a) {
      if (linkFile(a.getAttribute("href")) === here) {
        a.classList.add("is-active");
        a.setAttribute("aria-current", "page");
      } else {
        a.classList.remove("is-active");
        a.removeAttribute("aria-current");
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", highlight);
  } else {
    highlight();
  }
})();
