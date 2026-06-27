/* ============================================================
   CareerOS — GitHub Integration Module
   - Public REST API by username
   - No backend yet, so read GitHub's unauthenticated public endpoints
   - Persist result in localStorage

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
