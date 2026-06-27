/* ============================================================
   CareerOS — Navbar Module
   - Sticky glass navbar on scroll
   - Mobile menu toggle
   - Profile/account dropdown for authenticated users
   - prefers-reduced-motion aware
   ============================================================ */
(function () {
  "use strict";

  var prefersReduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* ---------- Sticky navbar glass on scroll ---------- */
  var nav = document.getElementById("nav");
  function onScroll() {
    if (!nav) return;
    nav.classList.toggle("is-scrolled", window.scrollY > 12);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Mobile menu (built dynamically from #navLinks) ---------- */
  var toggle = document.getElementById("navToggle");
  var menu = document.getElementById("mobileMenu");
  var header = document.getElementById("nav");
  var navLinks = document.getElementById("navLinks");

  // No page ships a #mobileMenu element — build one from the existing nav links
  // so the hamburger works on every page without editing each HTML file.
  if (!menu && navLinks && header) {
    menu = document.createElement("div");
    menu.className = "mobile-menu";
    menu.id = "mobileMenu";
    menu.setAttribute("aria-hidden", "true");

    var list = document.createElement("nav");
    list.className = "mobile-menu__links";
    list.setAttribute("aria-label", "Mobile");

    Array.prototype.forEach.call(navLinks.querySelectorAll("a"), function (a) {
      var link = document.createElement("a");
      link.href = a.getAttribute("href");
      link.textContent = a.textContent.trim();
      // The "Get Started" CTA keeps its primary-button styling.
      if (a.classList.contains("btn--primary")) {
        link.className = "btn btn--primary btn--lg mobile-menu__cta";
      } else {
        link.className = "mobile-menu__link";
      }
      list.appendChild(link);
    });

    menu.appendChild(list);
    header.insertAdjacentElement("afterend", menu);
  }

  function setMenu(open) {
    if (!toggle || !menu) return;
    toggle.classList.toggle("is-open", open);
    menu.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    menu.setAttribute("aria-hidden", String(!open));
    document.body.style.overflow = open ? "hidden" : "";
  }

  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      setMenu(!menu.classList.contains("is-open"));
    });
    menu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        setMenu(false);
      });
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setMenu(false);
    });
  }

  /* ---------- Account dropdown open/close behaviour ---------- */
  function closeAccountMenus(except) {
    document.querySelectorAll("[data-acct].is-open").forEach(function (acct) {
      if (acct === except) return;
      acct.classList.remove("is-open");
      var t = acct.querySelector("[data-acct-toggle]");
      if (t) t.setAttribute("aria-expanded", "false");
    });
  }

  document.addEventListener("click", function (e) {
    var toggle = e.target.closest("[data-acct-toggle]");
    if (toggle) {
      e.preventDefault();
      var acct = toggle.closest("[data-acct]");
      var willOpen = !acct.classList.contains("is-open");
      closeAccountMenus(acct);
      acct.classList.toggle("is-open", willOpen);
      toggle.setAttribute("aria-expanded", String(willOpen));
      return;
    }
    /* Clicks inside the menu (links / sign-out) act normally; everything
       else outside an open menu closes it. */
    if (e.target.closest("[data-acct-menu]")) return;
    closeAccountMenus(null);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeAccountMenus(null);
      setMenu(false);
    }
  });
})();
