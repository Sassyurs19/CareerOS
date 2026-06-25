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

  /* ---------- 2. Mobile menu toggle ---------- */
  var toggle = document.getElementById("navToggle");
  var menu = document.getElementById("mobileMenu");

  function setMenu(open) {
    if (!toggle || !menu) return;
    toggle.classList.toggle("is-open", open);
    menu.classList.toggle("is-open", open);
    toggle.setAttribute("aria-expanded", String(open));
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
      '<div class="loader__name">Career<b>OS</b></div>' +
      '<div class="loader__bar"><span class="loader__bar-fill" id="loaderFill"></span></div>' +
      '<div class="loader__pct" id="loaderPct">0%</div>' +
    '</div>';

  function mount() {
    document.body.appendChild(loader);
    document.body.style.overflow = "hidden";

    var fill = document.getElementById("loaderFill");
    var pctEl = document.getElementById("loaderPct");

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
        window.setTimeout(goNext, reduce ? 250 : 700);
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
