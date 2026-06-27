/* ============================================================
   CareerOS — Google Sign-In Module
   - Simulated account chooser (no backend yet)
   - Mirrors the GitHub module: localStorage-backed, element-guarded
   - Accessible modal
   - Because there is no OAuth server, openChooser() presents a Google-styled
     "Choose an account" picker that completes the sign-in locally and redirects
     to the page named in the body's [data-google-redirect] attribute (default: dashboard.html)

   Public API:
     CareerOS.google.connect(account)  -> Promise<profile>
     CareerOS.google.get()             -> profile | null
     CareerOS.google.disconnect()      -> void
     CareerOS.google.openChooser(onDone)
   ============================================================ */
(function () {
  "use strict";

  var STORE_KEY = "careeros.google";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------------------------------------------------------
     REAL GOOGLE OAUTH (Google Identity Services).
     Paste your OAuth Web Client ID from the Google Cloud Console
     here (e.g. "1234567890-abcd.apps.googleusercontent.com").
     Leave it empty ("") to use the local simulated account chooser.
     --------------------------------------------------------------- */
  var GOOGLE_CLIENT_ID = "510895472167-aorcvv3tivu7derq4krdbvpm9868129b.apps.googleusercontent.com";

  function googleConfigured() {
    return !!GOOGLE_CLIENT_ID && window.google && window.google.accounts && window.google.accounts.oauth2;
  }

  var CareerOS = (window.CareerOS = window.CareerOS || {});

  /* Demo accounts shown in the chooser. */
  var DEMO_ACCOUNTS = [
    { name: "Poornima Munnangi", email: "poornimamunnangi@gmail.com", color: "1A73E8" },
    { name: "Alex Rivera", email: "alex.rivera@gmail.com", color: "34A853" }
  ];

  var AVATAR_COLORS = ["1A73E8", "34A853", "EA4335", "FBBC05", "7B1FA2", "00897B"];

  /* ---------- escaping ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------- storage ---------- */
  function get() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }
  function save(data) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(data));
    } catch (e) {}
  }
  function disconnect() {
    /* Full sign-out: clear the Google identity AND any cached platform data,
       reset the UI immediately, then return to the public landing page. */
    try {
      localStorage.removeItem(STORE_KEY);
      localStorage.removeItem("careeros.github");
    } catch (e) {}
    reflectGoogle();
    renderGoogleDashboard();
    renderGoogleGreeting();
    renderGoogleNav();
    applyBrandTarget();
    window.location.href = "index.html";
  }

  /* ---------- helpers ---------- */
  function isEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }
  function colorFor(email) {
    var sum = 0;
    for (var i = 0; i < email.length; i++) sum += email.charCodeAt(i);
    return AVATAR_COLORS[sum % AVATAR_COLORS.length];
  }

  /* ---------- connect ---------- */
  function connect(account) {
    account = account || {};
    var email = (account.email || "").trim();
    if (!isEmail(email)) {
      return Promise.reject(new Error("Please enter a valid email address."));
    }
    var name = (account.name || "").trim() || email.split("@")[0];
    var profile = {
      email: email,
      name: name,
      avatar_initial: (name.charAt(0) || email.charAt(0) || "?").toUpperCase(),
      avatar_color: account.color || colorFor(email),
      connected_at: Date.now()
    };
    save(profile);
    reflectGoogle();
    renderGoogleDashboard();
    renderGoogleGreeting();
    renderGoogleNav();
    return Promise.resolve(profile);
  }

  CareerOS.google = {
    connect: connect,
    get: get,
    disconnect: disconnect,
    openChooser: openChooser
  };

  /* ---------- accessible chooser modal ---------- */
  var lastFocused = null;

  /* ---------- real Google OAuth (GIS) helpers ---------- */
  var tokenClient = null;
  var pendingOnDone = null;

  function realError(msg) {
    var errEl = document.getElementById("gAuthError");
    if (errEl) {
      errEl.textContent = msg;
      errEl.hidden = false;
    } else {
      try { console.warn("[Google sign-in] " + msg); } catch (e) {}
    }
  }

  function handleTokenResponse(resp) {
    if (!resp || resp.error || !resp.access_token) {
      realError("Google sign-in was cancelled or didn't complete. Please try again.");
      return;
    }
    fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: "Bearer " + resp.access_token }
    })
      .then(function (res) {
        if (!res.ok) throw new Error("userinfo " + res.status);
        return res.json();
      })
      .then(function (info) {
        var email = info.email || "";
        var name = info.name || email;
        var profile = {
          email: email,
          name: name,
          picture: info.picture || "",
          avatar_initial: (name || email || "?").charAt(0).toUpperCase(),
          avatar_color: colorFor(email || name || "?"),
          connected_at: Date.now()
        };
        save(profile);
        reflectGoogle();
        renderGoogleDashboard();
        renderGoogleGreeting();
        renderGoogleNav();
        var done = pendingOnDone;
        pendingOnDone = null;
        window.setTimeout(function () {
          if (typeof done === "function") done(profile);
        }, reduce ? 0 : 500);
      })
      .catch(function () {
        realError("We couldn't fetch your Google profile. Please try again.");
      });
  }

  function startRealFlow(onDone) {
    pendingOnDone = onDone;
    try {
      if (!tokenClient) {
        tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: "openid email profile",
          callback: handleTokenResponse
        });
      }
      tokenClient.requestAccessToken();
    } catch (e) {
      pendingOnDone = null;
      realError("Google sign-in is unavailable right now. Please try again.");
    }
  }

  function openChooser(onDone) {
    /* Real Google OAuth when a Client ID is configured and GIS has loaded. */
    if (googleConfigured()) {
      startRealFlow(onDone);
      return;
    }
    /* Otherwise fall back to the local simulated account chooser. */
    if (document.getElementById("gAuthModal")) return;
    lastFocused = document.activeElement;

    var overlay = document.createElement("div");
    overlay.className = "gh-modal g-modal";
    overlay.id = "gAuthModal";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "gAuthTitle");

    var googleLogo =
      '<span class="g-modal__logo" aria-hidden="true">' +
        '<svg viewBox="0 0 24 24" width="28" height="28">' +
          '<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/>' +
          '<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>' +
          '<path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/>' +
          '<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>' +
        '</svg>' +
      '</span>';

    overlay.innerHTML =
      '<div class="gh-modal__card g-modal__card" role="document">' +
        '<button class="gh-modal__close" type="button" aria-label="Close">&times;</button>' +
        googleLogo +
        '<h2 class="gh-modal__title g-modal__title" id="gAuthTitle">Choose an account</h2>' +
        '<p class="gh-modal__sub g-modal__sub">to continue to CareerOS</p>' +
        '<div class="g-modal__body" data-g-body></div>' +
        '<p class="gh-error" id="gAuthError" role="alert" hidden></p>' +
      '</div>';

    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";
    if (!reduce) {
      requestAnimationFrame(function () {
        overlay.classList.add("is-open");
      });
    } else {
      overlay.classList.add("is-open");
    }

    var card = overlay.querySelector(".gh-modal__card");
    var bodyEl = overlay.querySelector("[data-g-body]");
    var errEl = overlay.querySelector("#gAuthError");

    function showError(msg) {
      errEl.textContent = msg;
      errEl.hidden = false;
    }
    function clearError() {
      errEl.hidden = true;
    }

    function close() {
      overlay.classList.remove("is-open");
      document.removeEventListener("keydown", onKey, true);
      window.setTimeout(function () {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        document.body.style.overflow = "";
        if (lastFocused && lastFocused.focus) {
          try { lastFocused.focus(); } catch (e) {}
        }
      }, reduce ? 0 : 220);
    }

    function finish(account) {
      clearError();
      card.classList.add("is-busy");
      connect(account)
        .then(function (data) {
          var sub = overlay.querySelector(".g-modal__sub");
          if (sub) sub.textContent = "Signing you in…";
          window.setTimeout(function () {
            close();
            if (typeof onDone === "function") onDone(data);
          }, reduce ? 0 : 600);
        })
        .catch(function (err) {
          card.classList.remove("is-busy");
          showError(err.message || "Something went wrong. Please try again.");
        });
    }

    /* ----- chooser (account list) view ----- */
    function renderChooser() {
      clearError();
      var rows = DEMO_ACCOUNTS.map(function (a, i) {
        var initial = esc((a.name.charAt(0) || a.email.charAt(0)).toUpperCase());
        return (
          '<button class="g-account-row" type="button" data-g-pick="' + i + '">' +
            '<span class="g-avatar" style="background:#' + esc(a.color) + '" aria-hidden="true">' + initial + '</span>' +
            '<span class="g-account-row__meta">' +
              '<span class="g-account-row__name">' + esc(a.name) + '</span>' +
              '<span class="g-account-row__email">' + esc(a.email) + '</span>' +
            '</span>' +
          '</button>'
        );
      }).join("");

      rows +=
        '<button class="g-account-row g-account-row--other" type="button" data-g-other>' +
          '<span class="g-avatar g-avatar--other" aria-hidden="true">+</span>' +
          '<span class="g-account-row__meta">' +
            '<span class="g-account-row__name">Use another account</span>' +
          '</span>' +
        '</button>';

      bodyEl.innerHTML = '<div class="g-account-list">' + rows + '</div>';

      bodyEl.querySelectorAll("[data-g-pick]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var idx = parseInt(btn.getAttribute("data-g-pick"), 10);
          finish(DEMO_ACCOUNTS[idx]);
        });
      });
      var other = bodyEl.querySelector("[data-g-other]");
      if (other) other.addEventListener("click", renderForm);
    }

    /* ----- "use another account" form view ----- */
    function renderForm() {
      clearError();
      bodyEl.innerHTML =
        '<div class="g-form">' +
          '<label class="gh-modal__label" for="gName">Full name</label>' +
          '<input class="gh-input" id="gName" type="text" autocomplete="name" placeholder="Your name" />' +
          '<label class="gh-modal__label" for="gEmail">Email</label>' +
          '<input class="gh-input" id="gEmail" type="email" inputmode="email" autocomplete="email" spellcheck="false" placeholder="you@gmail.com" />' +
          '<div class="gh-modal__actions">' +
            '<button class="btn btn--ghost btn--sm" type="button" data-g-back>Back</button>' +
            '<button class="btn btn--primary btn--sm" type="button" data-g-submit>Continue</button>' +
          '</div>' +
        '</div>';

      var nameInput = bodyEl.querySelector("#gName");
      var emailInput = bodyEl.querySelector("#gEmail");
      try { emailInput.focus(); } catch (e) {}

      function submit() {
        var email = emailInput.value.trim();
        if (!isEmail(email)) {
          showError("Please enter a valid email address.");
          emailInput.focus();
          return;
        }
        finish({ name: nameInput.value, email: email });
      }

      bodyEl.querySelector("[data-g-submit]").addEventListener("click", submit);
      bodyEl.querySelector("[data-g-back]").addEventListener("click", renderChooser);
      [nameInput, emailInput].forEach(function (inp) {
        inp.addEventListener("input", clearError);
        inp.addEventListener("keydown", function (e) {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        });
      });
    }

    renderChooser();

    overlay.querySelector(".gh-modal__close").addEventListener("click", close);
    overlay.addEventListener("mousedown", function (e) {
      if (e.target === overlay) close();
    });

    /* keyboard: Escape closes, Tab is trapped inside the dialog */
    function onKey(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key === "Tab") {
        var f = overlay.querySelectorAll(
          'button:not([disabled]), input:not([disabled])'
        );
        if (!f.length) return;
        var first = f[0];
        var last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey, true);
  }

  /* ---------- reflect connected state on connect buttons ---------- */
  function reflectGoogle() {
    var data = get();
    document.querySelectorAll("[data-google-connect]").forEach(function (btn) {
      if (!btn.getAttribute("data-google-label")) {
        btn.setAttribute("data-google-label", btn.textContent.trim());
      }
      if (data) {
        btn.classList.add("is-connected");
        btn.textContent = "Signed in ✓ " + data.email;
      } else {
        btn.classList.remove("is-connected");
        btn.textContent = btn.getAttribute("data-google-label");
      }
    });
  }

  /* ---------- dashboard rendering ---------- */
  function renderGoogleDashboard() {
    var mount = document.querySelector("[data-google-dashboard]");
    if (!mount) return;
    var d = get();

    if (!d) {
      mount.innerHTML =
        '<div class="dash-panel__head">' +
          '<h2 class="dash-panel__title">Google</h2>' +
        '</div>' +
        '<div class="gh-empty">' +
          '<p class="gh-empty__txt">Sign in with Google to surface your verified identity here.</p>' +
          '<button class="btn btn--primary btn--sm" type="button" data-google-connect data-google-label="Continue with Google">Continue with Google</button>' +
        '</div>';
      reflectGoogle();
      return;
    }

    mount.innerHTML =
      '<div class="dash-panel__head">' +
        '<h2 class="dash-panel__title">Google</h2>' +
        '<div class="gh-card__actions">' +
          '<button class="dash-panel__link" type="button" data-google-disconnect>Disconnect</button>' +
        '</div>' +
      '</div>' +
      '<div class="gh-card__profile">' +
        (d.picture
          ? '<img class="g-avatar g-avatar--lg g-avatar-img" src="' + esc(d.picture) + '" alt="" width="64" height="64" loading="lazy" referrerpolicy="no-referrer" />'
          : '<span class="g-avatar g-avatar--lg" style="background:#' + esc(d.avatar_color) + '" aria-hidden="true">' + esc(d.avatar_initial) + '</span>') +
        '<div class="gh-card__meta">' +
          '<span class="gh-card__name">' + esc(d.name) + '</span>' +
          '<span class="gh-card__handle">' + esc(d.email) + '</span>' +
          '<p class="gh-card__bio">Connected via Google</p>' +
        '</div>' +
      '</div>';
  }

  /* ---------- global delegated triggers ---------- */
  document.addEventListener("click", function (e) {
    var disc = e.target.closest("[data-google-disconnect]");
    if (disc) {
      e.preventDefault();
      disconnect();
      return;
    }
    var trigger = e.target.closest("[data-google-connect]");
    if (trigger) {
      e.preventDefault();
      openChooser(function () {
        var redirect = document.body.getAttribute("data-google-redirect");
        if (redirect) {
          window.location.href = redirect;
        } else if (!document.querySelector("[data-google-dashboard]")) {
          window.location.href = "dashboard.html";
        }
      });
    }
  });

  /* ---------- init on load ---------- */
  function renderGoogleGreeting() {
    var nodes = document.querySelectorAll("[data-google-name]");
    if (!nodes.length) return;
    var d = get();
    if (!d) return;
    var first = "";
    if (d.name && String(d.name).trim()) {
      first = String(d.name).trim().split(/\s+/)[0];
    } else if (d.email) {
      first = String(d.email).split("@")[0];
    }
    if (!first) return;
    nodes.forEach(function (el) {
      el.textContent = esc(first);
    });
    var emailNodes = document.querySelectorAll("[data-google-email]");
    if (emailNodes.length && d.email) {
      emailNodes.forEach(function (el) {
        el.textContent = esc(d.email);
      });
    }
  }

  /* Never render placeholder identities (noreply / anonymous / user123 …).
     Fall back to a humanised email local-part, then a neutral label. */
  function displayName(d) {
    var bad = /^(no-?reply|anonymous|null|undefined|user\d*|guest)$/i;
    var raw = (d.name || "").trim();
    if (!raw || bad.test(raw)) {
      var local = (d.email || "").split("@")[0];
      if (local && !bad.test(local)) {
        raw = local.replace(/[._-]+/g, " ").replace(/\b\w/g, function (c) {
          return c.toUpperCase();
        });
      } else {
        raw = "";
      }
    }
    return raw || "Account";
  }

  var navMenuSeq = 0;

  /* ---------- navbar account dropdown ---------- */
  function renderGoogleNav() {
    var mounts = document.querySelectorAll("[data-google-navauth]");
    if (!mounts.length) return;
    var d = get();

    mounts.forEach(function (mount) {
      var variant = mount.getAttribute("data-nav-variant") || "desktop";

      /* Signed out: restore the default Sign In / Get Started links. */
      if (!d) {
        if (variant === "mobile") {
          mount.innerHTML =
            '<a href="signin.html" class="mobile-menu__link">Sign In</a>' +
            '<a href="signup.html" class="btn btn--primary mobile-menu__cta">Get Started</a>';
        } else {
          mount.innerHTML =
            '<a href="signin.html" class="nav__link nav__signin">Sign In</a>' +
            '<a href="signup.html" class="btn btn--primary btn--sm">Get Started</a>';
        }
        return;
      }

      /* Signed in: premium glassmorphism account dropdown. */
      var name = displayName(d);
      var triggerAvatar = d.picture
        ? '<img class="g-avatar acct__avatar g-avatar-img" src="' + esc(d.picture) + '" alt="" width="32" height="32" loading="lazy" referrerpolicy="no-referrer" />'
        : '<span class="g-avatar acct__avatar" style="background:#' + esc(d.avatar_color) + '" aria-hidden="true">' + esc(d.avatar_initial) + '</span>';
      var menuAvatar = d.picture
        ? '<img class="g-avatar acct-menu__avatar g-avatar-img" src="' + esc(d.picture) + '" alt="" width="40" height="40" loading="lazy" referrerpolicy="no-referrer" />'
        : '<span class="g-avatar acct-menu__avatar" style="background:#' + esc(d.avatar_color) + '" aria-hidden="true">' + esc(d.avatar_initial) + '</span>';

      var menuId = "acctMenu" + (++navMenuSeq);

      var items =
        '<a class="acct-menu__item" href="profile.html" role="menuitem">My Profile</a>' +
        '<button class="acct-menu__item acct-menu__item--disabled" type="button" role="menuitem" disabled aria-disabled="true">Settings<span class="acct-menu__soon">Coming Soon</span></button>' +
        '<div class="acct-menu__sep" role="separator"></div>' +
        '<button class="acct-menu__item acct-menu__item--danger" type="button" role="menuitem" data-google-disconnect>Sign Out</button>';

      mount.innerHTML =
        '<div class="acct" data-acct>' +
          '<button class="acct__trigger" type="button" data-acct-toggle aria-haspopup="true" aria-expanded="false" aria-controls="' + menuId + '">' +
            triggerAvatar +
            '<span class="acct__name">' + esc(name) + '</span>' +
            '<svg class="acct__chev" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          '</button>' +
          '<div class="acct-menu" id="' + menuId + '" role="menu" data-acct-menu>' +
            '<div class="acct-menu__head">' +
              menuAvatar +
              '<span class="acct-menu__meta">' +
                '<span class="acct-menu__name">' + esc(name) + '</span>' +
                (d.email ? '<span class="acct-menu__email">' + esc(d.email) + '</span>' : '') +
              '</span>' +
            '</div>' +
            '<div class="acct-menu__list">' + items + '</div>' +
          '</div>' +
        '</div>';
    });
  }

  /* Rewrite the brand logo target: signed-in users always land on the
     dashboard; signed-out users keep the public landing page. */
  function applyBrandTarget() {
    var target = get() ? "dashboard.html" : "index.html";
    document.querySelectorAll("a.brand").forEach(function (a) {
      a.setAttribute("href", target);
    });
  }

  /* ---------- account dropdown open/close behaviour ---------- */
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
    if (e.key === "Escape") closeAccountMenus(null);
  });

  function init() {
    /* ============================================================
       PUBLIC / APP AUTHENTICATION BOUNDARY
       Classify the current page, then enforce a hard separation:
       - signed-in users never see the auth screens OR the public
         marketing site during internal navigation;
       - signed-out users can never open an application page.
       ============================================================ */
    var profile = get();
    var path = window.location.pathname;

    var isAppPage =
      !!document.querySelector("[data-google-dashboard]") ||
      document.body.hasAttribute("data-app-page") ||
      /\/(dashboard|profile|resume|platform|roadmap|career-analysis)\.html$/i.test(path);

    var isAuthPage =
      (document.body.hasAttribute("data-google-redirect") && !isAppPage) ||
      /\/(signin|signup)\.html$/i.test(path);

    var isMarketingPage =
      /\/(index|about)\.html$/i.test(path) ||
      path === "/" ||
      /\/$/.test(path);

    if (profile) {
      /* Signed in → stay inside the application. Bounce the auth screens
         and any public marketing page back into the workspace. */
      var redirectTarget = document.body.getAttribute("data-google-redirect") || "dashboard.html";
      if (isAuthPage || isMarketingPage) {
        window.location.replace(redirectTarget);
        return;
      }
    } else {
      /* Signed out → protect every application page. */
      if (isAppPage) {
        window.location.replace("signin.html");
        return;
      }
    }
    reflectGoogle();
    renderGoogleDashboard();
    renderGoogleGreeting();
    renderGoogleNav();
    applyBrandTarget();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
