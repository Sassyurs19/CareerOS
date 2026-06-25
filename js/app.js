/* ============================================================
   CareerOS — front-end interactions
   - Sticky glass navbar on scroll
   - Mobile menu toggle
   - IntersectionObserver scroll-reveal
   - Clean loading screen with live percentage
   - prefers-reduced-motion aware
   ============================================================ */
(function () {
  "use strict";

  var prefersReduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  /* ---------- 1. Sticky navbar glass on scroll ---------- */
  var nav = document.getElementById("nav");
  function onScroll() {
    if (!nav) return;
    nav.classList.toggle("is-scrolled", window.scrollY > 12);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- 2. Mobile menu (built dynamically from #navLinks) ---------- */
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

  /* ---------- 3. Scroll-reveal via IntersectionObserver ---------- */
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



/* ============================================================
   Loading screen — small CareerOS logo (no box) + live
   percentage counter. Injected on every page, then fades out.
   Reduced-motion friendly.
   ============================================================ */
(function () {
  "use strict";
  if (document.getElementById("careerLoader")) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var loader = document.createElement("div");
  loader.className = "loader";
  loader.id = "careerLoader";
  loader.setAttribute("role", "status");
  loader.setAttribute("aria-label", "Loading CareerOS");
  loader.innerHTML =
    '<div class="loader__core">' +
      '<svg class="loader__logo" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
        '<path d="M3.5 16.5 L9.5 10 L13.5 13 L20.5 5" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<circle cx="20.5" cy="5" r="2" fill="#ffffff"/>' +
      '</svg>' +
      '<div class="loader__name">𝘾𝙖𝙧𝙚𝙚𝙧𝙊𝙎</div>' +
      '<div class="loader__tagline" id="loaderTag">Initializing…</div>' +
      '<div class="loader__bar"><span class="loader__bar-fill" id="loaderFill"></span></div>' +
      '<div class="loader__pct" id="loaderPct">0%</div>' +
    '</div>';

  function mount() {
    document.body.appendChild(loader);
    document.body.style.overflow = "hidden";

    var fill = document.getElementById("loaderFill");
    var pctEl = document.getElementById("loaderPct");
    var tagEl = document.getElementById("loaderTag");

    /* Rotating status messages keep the loader feeling alive. */
    var loaderTags = [
      "Initializing…",
      "Connecting your ecosystem…",
      "Verifying achievements…",
      "Syncing your profile…",
      "Almost there…"
    ];
    var tagIdx = 0;
    var tagIv = window.setInterval(function () {
      if (!tagEl) { window.clearInterval(tagIv); return; }
      tagIdx = (tagIdx + 1) % loaderTags.length;
      tagEl.style.opacity = "0";
      window.setTimeout(function () {
        tagEl.textContent = loaderTags[tagIdx];
        tagEl.style.opacity = "";
      }, reduce ? 0 : 220);
    }, reduce ? 600 : 900);

    /* Adaptive hold: derived from the Network Information API when present,
       otherwise from actual page-load timing. Never a fixed 3s. */
    var conn =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;

    var hold;            // target hold duration in ms
    var useLoadEvent = false;

    if (reduce) {
      hold = 450;        // minimal motion
    } else if (conn) {
      if (conn.saveData) {
        hold = 1500;     // Data Saver on → keep it brief but present
      } else {
        switch (conn.effectiveType) {
          case "slow-2g":
          case "2g":
            hold = 2000;
            break;
          case "3g":
            hold = 1000;
            break;
          case "4g":
            hold = conn.downlink && conn.downlink >= 5 ? 300 : 550;
            break;
          default:
            hold = 700;
        }
      }
    } else {
      // No Network Information API → hide as soon as the page is ready,
      // bounded to a sensible 600–1800ms window.
      useLoadEvent = true;
      hold = 1800;       // ceiling
    }

    var MIN_HOLD = reduce ? 350 : 600;
    var start = performance.now();
    var done = false;

    function finish() {
      if (done) return;
      done = true;
      if (pctEl) pctEl.textContent = "100%";
      if (fill) fill.style.width = "100%";
      window.setTimeout(function () {
        loader.classList.add("is-hidden");
        document.body.style.overflow = "";
        window.setTimeout(function () {
          if (loader.parentNode) loader.parentNode.removeChild(loader);
        }, 700);
      }, 120);
    }

    // Percentage + bar ramp, kept in sync with the resolved hold.
    function tick(now) {
      if (done) return;
      var pct = Math.min(99, Math.round(((now - start) / hold) * 100));
      if (pctEl) pctEl.textContent = pct + "%";
      if (fill) fill.style.width = pct + "%";
      if (now - start >= hold) {
        finish();
      } else {
        requestAnimationFrame(tick);
      }
    }
    requestAnimationFrame(tick);

    // Fallback path: resolve on real page load, respecting the minimum floor.
    if (useLoadEvent) {
      var onReady = function () {
        var elapsed = performance.now() - start;
        if (elapsed >= MIN_HOLD) finish();
        else window.setTimeout(finish, MIN_HOLD - elapsed);
      };
      if (document.readyState === "complete") onReady();
      else window.addEventListener("load", onReady, { once: true });
    }
  }

  if (document.body) {
    mount();
  } else {
    document.addEventListener("DOMContentLoaded", mount);
  }
})();




/* ============================================================
   AUTH MODULE — powers signup.html (multi-step) and
   signin.html (OAuth + email → OTP). Element-guarded so the
   marketing pages are completely unaffected.
   ============================================================ */
(function () {
  "use strict";

  var root = document.getElementById("obMain");
  if (!root) return; // not an auth page

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var steps = Array.prototype.slice.call(root.querySelectorAll(".ob-step"));
  if (!steps.length) return;

  var backBtn = document.getElementById("obBack");
  var progressFill = document.getElementById("obProgressFill");
  var stepsDots = document.getElementById("obSteps");
  var total = steps.length;
  var current = 0;       // index into steps[]
  var history = [];      // visited indices for back navigation

  /* ---------- Build step dots ---------- */
  if (stepsDots) {
    stepsDots.innerHTML = "";
    for (var i = 0; i < total; i++) {
      var dot = document.createElement("span");
      dot.className = "ob-steps__dot";
      stepsDots.appendChild(dot);
    }
    stepsDots.setAttribute("aria-hidden", "false");
  }

  function updateChrome() {
    if (progressFill) {
      progressFill.style.width = ((current + 1) / total) * 100 + "%";
    }
    if (stepsDots) {
      var dots = stepsDots.children;
      for (var i = 0; i < dots.length; i++) {
        dots[i].classList.toggle("is-active", i === current);
        dots[i].classList.toggle("is-done", i < current);
      }
    }
    if (backBtn) {
      backBtn.hidden = history.length === 0;
    }
  }

  function reflowAnimation(stepEl) {
    var inner = stepEl.querySelector(".ob-step__inner");
    if (inner && !reduce) {
      inner.style.animation = "none";
      // force reflow then restore
      void inner.offsetWidth;
      inner.style.animation = "";
    }
  }

  function show(index, pushHistory) {
    if (index < 0 || index >= total || index === current) return;
    if (pushHistory !== false) history.push(current);
    steps[current].hidden = true;
    steps[current].classList.remove("is-active");
    current = index;
    steps[current].hidden = false;
    steps[current].classList.add("is-active");
    reflowAnimation(steps[current]);
    updateChrome();
    var focusable = steps[current].querySelector("h1, h2, [autofocus]");
    if (focusable && focusable.hasAttribute("autofocus")) {
      try { focusable.focus(); } catch (e) {}
    }
    var onEnter = steps[current].getAttribute("data-onenter");
    if (onEnter === "loading") runLoading();
  }

  function goNext() {
    if (current < total - 1) show(current + 1);
  }

  function goBack() {
    if (!history.length) return;
    var prev = history.pop();
    steps[current].hidden = true;
    steps[current].classList.remove("is-active");
    current = prev;
    steps[current].hidden = false;
    steps[current].classList.add("is-active");
    reflowAnimation(steps[current]);
    updateChrome();
  }

  if (backBtn) backBtn.addEventListener("click", goBack);

  /* ---------- Generic [data-next] navigation ---------- */
  root.addEventListener("click", function (e) {
    var nextBtn = e.target.closest("[data-next]");
    if (nextBtn && !nextBtn.disabled) {
      e.preventDefault();
      goNext();
    }
  });

  /* ---------- Single-select (cards & chips) ---------- */
  var singleState = {};
  root.querySelectorAll("[data-single]").forEach(function (el) {
    el.addEventListener("click", function () {
      var group = el.getAttribute("data-single");
      var groupEls = root.querySelectorAll('[data-single="' + group + '"]');
      groupEls.forEach(function (g) {
        var on = g === el;
        g.classList.toggle("is-selected", on);
        if (g.hasAttribute("role")) g.setAttribute("aria-checked", String(on));
      });
      singleState[group] = el.getAttribute("data-value");
      refreshRequirements();
      // Single-choice steps marked [data-advance] auto-submit on selection.
      if (el.closest("[data-advance]")) {
        window.setTimeout(goNext, reduce ? 0 : 280);
      }
    });
  });

  /* ---------- Multi-select chips ---------- */
  var multiState = {};
  root.querySelectorAll("[data-multi]").forEach(function (el) {
    el.addEventListener("click", function () {
      var group = el.getAttribute("data-multi");
      multiState[group] = multiState[group] || [];
      var val = el.getAttribute("data-value");
      var on = !el.classList.contains("is-selected");
      el.classList.toggle("is-selected", on);
      el.setAttribute("aria-pressed", String(on));
      var idx = multiState[group].indexOf(val);
      if (on && idx === -1) multiState[group].push(val);
      else if (!on && idx > -1) multiState[group].splice(idx, 1);
    });
  });

  /* ---------- Requirement-gated continue buttons ---------- */
  function refreshRequirements() {
    root.querySelectorAll("[data-requires]").forEach(function (btn) {
      var req = btn.getAttribute("data-requires");
      btn.disabled = !singleState[req];
    });
  }
  refreshRequirements();

  /* ---------- Connect ecosystem rows ---------- */
  root.querySelectorAll(".ob-connect__row").forEach(function (row) {
    var btn = row.querySelector(".ob-connect__btn");
    if (!btn) return;
    // GitHub uses the real CareerOS.github connect modal (delegated handler).
    if (row.getAttribute("data-connect") === "GitHub") return;
    btn.addEventListener("click", function () {
      btn.disabled = true;
      btn.textContent = "Connecting…";
      window.setTimeout(function () {
        row.classList.add("is-connected");
      }, reduce ? 120 : 760);
    });
  });

  /* ---------- Step 5: animated loading messages ---------- */
  var loadingMessages = [
    "Importing achievements…",
    "Building your profile…",
    "Preparing career insights…",
    "Generating resume foundation…",
    "Almost ready…"
  ];

  function runLoading() {
    var msgEl = document.getElementById("obLoadingMsg");
    var fillEl = document.getElementById("obLoadingFill");
    var pctEl = document.getElementById("obLoadingPct");
    var step = 0;
    var perMsg = reduce ? 360 : 920;
    var nextStep = root.querySelector('.ob-step[data-onfinish-next]') ? true : true;

    function update() {
      if (msgEl && loadingMessages[step]) {
        msgEl.style.opacity = "0";
        window.setTimeout(function () {
          msgEl.textContent = loadingMessages[step];
          msgEl.style.opacity = "1";
        }, reduce ? 0 : 200);
      }
      var pct = Math.round(((step + 1) / loadingMessages.length) * 100);
      if (fillEl) fillEl.style.width = pct + "%";
      if (pctEl) pctEl.textContent = pct + "%";
      step++;
      if (step < loadingMessages.length) {
        window.setTimeout(update, perMsg);
      } else {
        // Advance to the success step. If there is no next step (misconfigured
        // deck), fall back to the last step / a step marked as success so the
        // flow never stays stuck on "Importing achievements…".
        window.setTimeout(function () {
          if (current < total - 1) {
            goNext();
          } else {
            var successStep = root.querySelector(".ob-success");
            if (successStep) {
              var idx = steps.indexOf(successStep.closest(".ob-step"));
              if (idx > -1 && idx !== current) show(idx);
            }
          }
        }, reduce ? 250 : 700);
      }
    }
    update();
  }

  /* ---------- Email → OTP flow (signin + signup email option) ---------- */
  var emailPanel = document.getElementById("obEmailPanel");
  if (emailPanel) {
    var emailEntry = emailPanel.querySelector("[data-email-entry]");
    var codeEntry = emailPanel.querySelector("[data-code-entry]");
    var emailInput = emailPanel.querySelector(".ob-input[type='email']");
    var emailContinue = emailPanel.querySelector("[data-email-continue]");
    var emailTarget = emailPanel.querySelector("[data-email-target]");
    var boxes = Array.prototype.slice.call(emailPanel.querySelectorAll(".ob-otp__box"));
    var verifyBtn = emailPanel.querySelector("[data-otp-verify]");
    var resendBtn = emailPanel.querySelector("[data-otp-resend]");

    function validEmail(v) {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    }

    if (emailContinue && emailInput) {
      function submitEmail() {
        if (!validEmail(emailInput.value.trim())) {
          emailInput.focus();
          emailInput.style.borderColor = "rgba(255,120,120,0.8)";
          return;
        }
        if (emailTarget) emailTarget.textContent = emailInput.value.trim();
        if (emailEntry) emailEntry.hidden = true;
        if (codeEntry) codeEntry.hidden = false;
        if (boxes[0]) { try { boxes[0].focus(); } catch (e) {} }
      }
      emailContinue.addEventListener("click", submitEmail);
      emailInput.addEventListener("input", function () { emailInput.style.borderColor = ""; });
      emailInput.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); submitEmail(); }
      });
    }

    /* OTP box auto-advance */
    boxes.forEach(function (box, idx) {
      box.addEventListener("input", function () {
        box.value = box.value.replace(/\D/g, "").slice(0, 1);
        box.classList.toggle("is-filled", box.value !== "");
        if (box.value && boxes[idx + 1]) boxes[idx + 1].focus();
      });
      box.addEventListener("keydown", function (e) {
        if (e.key === "Backspace" && !box.value && boxes[idx - 1]) {
          boxes[idx - 1].focus();
        }
      });
      box.addEventListener("paste", function (e) {
        e.preventDefault();
        var data = (e.clipboardData || window.clipboardData).getData("text").replace(/\D/g, "");
        for (var k = 0; k < boxes.length; k++) {
          boxes[k].value = data[k] || "";
          boxes[k].classList.toggle("is-filled", !!data[k]);
        }
        var last = Math.min(data.length, boxes.length) - 1;
        if (last >= 0) boxes[last].focus();
      });
    });

    if (verifyBtn) {
      verifyBtn.addEventListener("click", function () {
        var code = boxes.map(function (b) { return b.value; }).join("");
        if (code.length < boxes.length) {
          var firstEmpty = boxes.filter(function (b) { return !b.value; })[0];
          if (firstEmpty) firstEmpty.focus();
          return;
        }
        verifyBtn.disabled = true;
        verifyBtn.textContent = "Verifying…";
        window.setTimeout(function () {
          window.location.href = "index.html";
        }, reduce ? 250 : 900);
      });
    }

    if (resendBtn) {
      resendBtn.addEventListener("click", function () {
        var label = resendBtn.textContent;
        resendBtn.disabled = true;
        var t = 30;
        resendBtn.textContent = "Resend in " + t + "s";
        var iv = window.setInterval(function () {
          t--;
          if (t <= 0) {
            window.clearInterval(iv);
            resendBtn.disabled = false;
            resendBtn.textContent = label;
          } else {
            resendBtn.textContent = "Resend in " + t + "s";
          }
        }, 1000);
      });
    }
  }

  /* ---------- Reveal "Continue with Email" panels ---------- */
  root.querySelectorAll("[data-show-email]").forEach(function (trigger) {
    trigger.addEventListener("click", function (e) {
      e.preventDefault();
      var oauth = trigger.closest("[data-oauth-block]");
      var panel = document.getElementById("obEmailPanel");
      if (oauth) oauth.hidden = true;
      if (panel) panel.hidden = false;
    });
  });

  updateChrome();
})();




/* ============================================================
   GITHUB INTEGRATION — public REST API by username.
   No backend yet, so we read GitHub's unauthenticated public
   endpoints and persist the result in localStorage.

   TODO: replace with server-side OAuth when backend is added
   (username lookup is rate-limited to 60 req/hr per IP and only
   exposes public data — OAuth would give private repos + higher
   limits and a verified identity).

   Public API:
     CareerOS.github.connect(username) -> Promise<profile>
     CareerOS.github.get()             -> profile | null
     CareerOS.github.disconnect()      -> void
     CareerOS.github.openModal(onDone) -> opens the connect dialog
   ============================================================ */
(function () {
  "use strict";

  var STORE_KEY = "careeros.github";
  var API = "https://api.github.com";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var CareerOS = (window.CareerOS = window.CareerOS || {});

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
    try {
      localStorage.removeItem(STORE_KEY);
    } catch (e) {}
    reflectButtons();
    renderDashboard();
  }

  /* ---------- fetch + aggregate ---------- */
  function fetchJSON(url) {
    return fetch(url, {
      headers: { Accept: "application/vnd.github+json" }
    }).then(function (res) {
      if (res.status === 404) {
        var e404 = new Error("We couldn't find a GitHub user with that username.");
        e404.code = 404;
        throw e404;
      }
      if (res.status === 403) {
        var e403 = new Error("GitHub's hourly request limit was reached. Please try again later.");
        e403.code = 403;
        throw e403;
      }
      if (!res.ok) {
        throw new Error("GitHub request failed (" + res.status + "). Please try again.");
      }
      return res.json();
    });
  }

  function aggregate(user, repos) {
    var totalStars = 0;
    var langCount = {};
    (repos || []).forEach(function (r) {
      totalStars += r.stargazers_count || 0;
      if (r.language) {
        langCount[r.language] = (langCount[r.language] || 0) + 1;
      }
    });

    var topLanguages = Object.keys(langCount)
      .map(function (name) {
        return { name: name, count: langCount[name] };
      })
      .sort(function (a, b) {
        return b.count - a.count;
      })
      .slice(0, 6);

    var topRepos = (repos || [])
      .slice()
      .sort(function (a, b) {
        return (b.stargazers_count || 0) - (a.stargazers_count || 0);
      })
      .slice(0, 5)
      .map(function (r) {
        return {
          name: r.name,
          stars: r.stargazers_count || 0,
          description: r.description || "",
          language: r.language || "",
          html_url: r.html_url
        };
      });

    return {
      username: user.login,
      name: user.name || user.login,
      avatar_url: user.avatar_url,
      bio: user.bio || "",
      html_url: user.html_url,
      public_repos: user.public_repos || 0,
      followers: user.followers || 0,
      following: user.following || 0,
      total_stars: totalStars,
      top_languages: topLanguages,
      top_repos: topRepos,
      connected_at: Date.now()
    };
  }

  function connect(username) {
    username = (username || "").trim().replace(/^@/, "");
    if (!username || !/^[A-Za-z0-9-]+$/.test(username)) {
      return Promise.reject(new Error("Please enter a valid GitHub username."));
    }
    var enc = encodeURIComponent(username);
    return Promise.all([
      fetchJSON(API + "/users/" + enc),
      fetchJSON(API + "/users/" + enc + "/repos?per_page=100&sort=updated")
    ]).then(function (results) {
      var data = aggregate(results[0], Array.isArray(results[1]) ? results[1] : []);
      save(data);
      reflectButtons();
      renderDashboard();
      return data;
    });
  }

  CareerOS.github = {
    connect: connect,
    get: get,
    disconnect: disconnect,
    openModal: openModal
  };

  /* ---------- accessible modal ---------- */
  var lastFocused = null;

  function openModal(onDone) {
    if (document.getElementById("ghModal")) return;
    lastFocused = document.activeElement;

    var overlay = document.createElement("div");
    overlay.className = "gh-modal";
    overlay.id = "ghModal";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "ghModalTitle");
    overlay.innerHTML =
      '<div class="gh-modal__card" role="document">' +
        '<button class="gh-modal__close" type="button" aria-label="Close">&times;</button>' +
        '<span class="gh-modal__logo" aria-hidden="true">' +
          '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.3.8-.6v-2c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.8 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17 4.6 18 4.9 18 4.9c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.5-2.7 5.5-5.3 5.8.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5z"/></svg>' +
        '</span>' +
        '<h2 class="gh-modal__title" id="ghModalTitle">Connect GitHub</h2>' +
        '<p class="gh-modal__sub">Enter your GitHub username to import your public repos, stars and languages.</p>' +
        '<label class="gh-modal__label" for="ghModalInput">GitHub username</label>' +
        '<div class="gh-modal__field">' +
          '<span class="gh-modal__at" aria-hidden="true">@</span>' +
          '<input class="gh-input" id="ghModalInput" type="text" autocomplete="off" spellcheck="false" placeholder="octocat" />' +
        '</div>' +
        '<p class="gh-error" id="ghModalError" role="alert" hidden></p>' +
        '<div class="gh-modal__actions">' +
          '<button class="btn btn--ghost btn--sm" type="button" data-gh-cancel>Cancel</button>' +
          '<button class="btn btn--primary btn--sm" type="button" data-gh-submit>Connect</button>' +
        '</div>' +
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

    var input = overlay.querySelector("#ghModalInput");
    var errEl = overlay.querySelector("#ghModalError");
    var submitBtn = overlay.querySelector("[data-gh-submit]");
    var card = overlay.querySelector(".gh-modal__card");

    try { input.focus(); } catch (e) {}

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

    function showError(msg) {
      errEl.textContent = msg;
      errEl.hidden = false;
    }

    function setBusy(busy) {
      submitBtn.disabled = busy;
      input.disabled = busy;
      submitBtn.textContent = busy ? "Connecting…" : "Connect";
      card.classList.toggle("is-busy", busy);
    }

    function submit() {
      errEl.hidden = true;
      var value = input.value.trim();
      if (!value) {
        showError("Please enter a GitHub username.");
        input.focus();
        return;
      }
      setBusy(true);
      connect(value)
        .then(function (data) {
          close();
          if (typeof onDone === "function") onDone(data);
        })
        .catch(function (err) {
          setBusy(false);
          showError(err.message || "Something went wrong. Please try again.");
          input.focus();
        });
    }

    overlay.querySelector("[data-gh-submit]").addEventListener("click", submit);
    overlay.querySelector("[data-gh-cancel]").addEventListener("click", close);
    overlay.querySelector(".gh-modal__close").addEventListener("click", close);
    overlay.addEventListener("mousedown", function (e) {
      if (e.target === overlay) close();
    });
    input.addEventListener("input", function () {
      errEl.hidden = true;
    });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        submit();
      }
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
  function reflectButtons() {
    var data = get();

    /* Homepage / generic connect triggers */
    document.querySelectorAll("[data-gh-connect]").forEach(function (btn) {
      if (data) {
        btn.classList.add("is-connected");
        btn.textContent = "Connected ✓ @" + data.username;
      } else {
        btn.classList.remove("is-connected");
        if (btn.getAttribute("data-gh-label")) {
          btn.textContent = btn.getAttribute("data-gh-label");
        }
      }
    });

    /* Onboarding ecosystem row (Step 3) */
    var row = document.querySelector('.ob-connect__row[data-connect="GitHub"]');
    if (row) {
      var rowBtn = row.querySelector(".ob-connect__btn");
      if (data) {
        row.classList.add("is-connected");
        if (rowBtn) {
          rowBtn.disabled = false;
          rowBtn.textContent = "Connected ✓";
        }
        var hint = row.querySelector(".ob-connect__hint");
        if (hint) hint.textContent = "@" + data.username + " · " + data.public_repos + " repos · " + data.total_stars + " stars";
      } else {
        row.classList.remove("is-connected");
        if (rowBtn) {
          rowBtn.disabled = false;
          rowBtn.textContent = "Connect";
        }
      }
    }
  }

  /* ---------- dashboard rendering ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function renderDashboard() {
    var mount = document.querySelector("[data-gh-dashboard]");
    if (!mount) return;
    var d = get();

    if (!d) {
      mount.innerHTML =
        '<div class="dash-panel__head">' +
          '<h2 class="dash-panel__title">GitHub</h2>' +
        '</div>' +
        '<div class="gh-empty">' +
          '<p class="gh-empty__txt">Connect your GitHub to surface your repositories, stars and top languages here.</p>' +
          '<button class="btn btn--primary btn--sm" type="button" data-gh-connect data-gh-label="Connect GitHub">Connect GitHub</button>' +
        '</div>';
      reflectButtons();
      bindDashboardActions(mount);
      return;
    }

    var langs = (d.top_languages || [])
      .map(function (l) {
        return '<span class="gh-lang">' + esc(l.name) + '</span>';
      })
      .join("");

    var repos = (d.top_repos || [])
      .map(function (r) {
        return (
          '<li class="gh-repo">' +
            '<a class="gh-repo__name" href="' + esc(r.html_url) + '" target="_blank" rel="noopener noreferrer">' + esc(r.name) + '</a>' +
            '<span class="gh-repo__stars" aria-label="' + r.stars + ' stars">★ ' + r.stars + '</span>' +
            (r.description ? '<span class="gh-repo__desc">' + esc(r.description) + '</span>' : "") +
          '</li>'
        );
      })
      .join("");

    mount.innerHTML =
      '<div class="dash-panel__head">' +
        '<h2 class="dash-panel__title">GitHub</h2>' +
        '<div class="gh-card__actions">' +
          '<button class="dash-panel__link" type="button" data-gh-refresh>Refresh</button>' +
          '<button class="dash-panel__link" type="button" data-gh-disconnect>Disconnect</button>' +
        '</div>' +
      '</div>' +
      '<div class="gh-card__profile">' +
        '<img class="gh-card__avatar" src="' + esc(d.avatar_url) + '" alt="" width="64" height="64" loading="lazy" />' +
        '<div class="gh-card__meta">' +
          '<a class="gh-card__name" href="' + esc(d.html_url) + '" target="_blank" rel="noopener noreferrer">' + esc(d.name) + '</a>' +
          '<span class="gh-card__handle">@' + esc(d.username) + '</span>' +
          (d.bio ? '<p class="gh-card__bio">' + esc(d.bio) + '</p>' : "") +
        '</div>' +
      '</div>' +
      '<div class="gh-card__stats">' +
        '<div class="gh-stat"><span class="gh-stat__value">' + d.public_repos + '</span><span class="gh-stat__label">Public repos</span></div>' +
        '<div class="gh-stat"><span class="gh-stat__value">' + d.total_stars + '</span><span class="gh-stat__label">Total stars</span></div>' +
        '<div class="gh-stat"><span class="gh-stat__value">' + d.followers + '</span><span class="gh-stat__label">Followers</span></div>' +
      '</div>' +
      (langs ? '<div class="gh-card__section"><h3 class="gh-card__subtitle">Top languages</h3><div class="gh-langs">' + langs + '</div></div>' : "") +
      (repos ? '<div class="gh-card__section"><h3 class="gh-card__subtitle">Top repositories</h3><ul class="gh-repos">' + repos + '</ul></div>' : "");

    bindDashboardActions(mount);
  }

  function bindDashboardActions(mount) {
    var refresh = mount.querySelector("[data-gh-refresh]");
    if (refresh) {
      refresh.addEventListener("click", function () {
        var d = get();
        if (!d) return;
        refresh.textContent = "Refreshing…";
        refresh.disabled = true;
        connect(d.username)
          .catch(function () {})
          .then(function () {
            /* renderDashboard() re-creates the button, so no reset needed */
          });
      });
    }
    var disc = mount.querySelector("[data-gh-disconnect]");
    if (disc) {
      disc.addEventListener("click", disconnect);
    }
  }

  /* ---------- global delegated triggers ---------- */
  document.addEventListener("click", function (e) {
    var trigger = e.target.closest("[data-gh-connect]");
    if (trigger) {
      e.preventDefault();
      openModal();
      return;
    }
    /* Onboarding Step 3 GitHub row — intercept its Connect button */
    var ghRowBtn = e.target.closest('.ob-connect__row[data-connect="GitHub"] .ob-connect__btn');
    if (ghRowBtn && !get()) {
      /* let it open the modal instead of the generic fake connect */
      openModal();
    }
  });

  /* ---------- init on load ---------- */
  function init() {
    reflectButtons();
    renderDashboard();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();



/* ============================================================
   GOOGLE SIGN-IN — simulated account chooser (no backend yet).
   Mirrors the GitHub module: localStorage-backed, element-guarded,
   accessible modal. Because there is no OAuth server, openChooser()
   presents a Google-styled "Choose an account" picker that completes
   the sign-in locally and redirects to the page named in the body's
   [data-google-redirect] attribute (default: dashboard.html).

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
    try {
      localStorage.removeItem(STORE_KEY);
    } catch (e) {}
    reflectGoogle();
    renderGoogleDashboard();
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

  function openChooser(onDone) {
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
        '<span class="g-avatar g-avatar--lg" style="background:#' + esc(d.avatar_color) + '" aria-hidden="true">' + esc(d.avatar_initial) + '</span>' +
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
  function init() {
    reflectGoogle();
    renderGoogleDashboard();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
