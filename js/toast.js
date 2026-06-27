/* ============================================================
   TOAST NOTIFICATION SYSTEM — Premium, Minimal, Glassmorphism
   ============================================================ */

(function() {
  'use strict';

  // Toast icons (SVG)
  const icons = {
    success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg>`,
    error: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
    loading: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>`,
    close: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
  };

  // Toast state
  const state = {
    container: null,
    queue: [],
    visible: [],
    maxVisible: 3,
    autoDismissDuration: 4000,
    idCounter: 0
  };

  // Initialize toast container
  function initContainer() {
    if (state.container) return state.container;

    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      container.setAttribute('role', 'region');
      container.setAttribute('aria-live', 'polite');
      container.setAttribute('aria-label', 'Notifications');
      document.body.appendChild(container);
    }
    state.container = container;
    return container;
  }

  // Create toast element
  function createToast(options) {
    const id = ++state.idCounter;
    const toast = document.createElement('div');
    toast.className = `toast toast--${options.type}`;
    toast.id = `toast-${id}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', options.type === 'error' || options.type === 'warning' ? 'assertive' : 'polite');

    const icon = icons[options.type] || icons.info;
    const closeIcon = icons.close;

    toast.innerHTML = `
      <div class="toast__icon">${icon}</div>
      <div class="toast__content">
        <div class="toast__title">${escapeHtml(options.title)}</div>
        ${options.description ? `<div class="toast__description">${escapeHtml(options.description)}</div>` : ''}
        ${options.actions ? `<div class="toast__actions">${options.actions.map(action => 
          `<button class="toast__action" data-action="${action.id}">${escapeHtml(action.label)}</button>`
        ).join('')}</div>` : ''}
      </div>
      <button class="toast__close" aria-label="Close notification">${closeIcon}</button>
      <div class="toast__progress"><div class="toast__progress-bar"></div></div>
    `;

    // Add event listeners
    const closeBtn = toast.querySelector('.toast__close');
    closeBtn.addEventListener('click', () => dismissToast(id));

    // Action buttons
    if (options.actions) {
      options.actions.forEach(action => {
        const btn = toast.querySelector(`[data-action="${action.id}"]`);
        if (btn && action.handler) {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            action.handler();
            dismissToast(id);
          });
        }
      });
    }

    // Pause on hover
    toast.addEventListener('mouseenter', () => {
      if (toast._dismissTimer) {
        clearTimeout(toast._dismissTimer);
        toast._paused = true;
      }
    });

    toast.addEventListener('mouseleave', () => {
      if (toast._paused && !toast._manualDismiss) {
        toast._paused = false;
        startDismissTimer(toast, id);
      }
    });

    // Keyboard navigation
    toast.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        dismissToast(id);
      }
    });

    return { element: toast, id, options };
  }

  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Show toast
  function showToast(options) {
    const container = initContainer();
    const toast = createToast(options);

    // Add to queue if max visible reached
    if (state.visible.length >= state.maxVisible) {
      state.queue.push(toast);
 toast.element.style.display = 'none';
      container.appendChild(toast.element);
      return toast.id;
    }

    // Show immediately
    container.appendChild(toast.element);
    state.visible.push(toast);

    // Trigger animation
    requestAnimationFrame(() => {
      toast.element.classList.add('is-visible');
    });

    // Auto dismiss (except for loading toasts)
    if (options.type !== 'loading' && options.autoDismiss !== false) {
      startDismissTimer(toast.element, toast.id);
    }

    return toast.id;
  }

  // Start dismiss timer
  function startDismissTimer(toastElement, id) {
    const duration = toastElement._duration || state.autoDismissDuration;
    const progressBar = toastElement.querySelector('.toast__progress-bar');
    
    if (progressBar) {
      progressBar.style.transition = `transform ${duration}ms linear`;
      progressBar.style.transform = 'scaleX(0)';
    }

    toastElement._dismissTimer = setTimeout(() => {
      dismissToast(id);
    }, duration);
  }

  // Dismiss toast
  function dismissToast(id) {
    const index = state.visible.findIndex(t => t.id === id);
    if (index === -1) return;

    const toast = state.visible[index];
    toast.element._manualDismiss = true;

    if (toast.element._dismissTimer) {
      clearTimeout(toast.element._dismissTimer);
    }

    toast.element.classList.remove('is-visible');
    toast.element.classList.add('is-exiting');

    setTimeout(() => {
      if (toast.element.parentNode) {
        toast.element.parentNode.removeChild(toast.element);
      }
      state.visible.splice(index, 1);

      // Process queue
      processQueue();
    }, 300);
  }

  // Process queue
  function processQueue() {
    if (state.queue.length === 0 || state.visible.length >= state.maxVisible) return;

    const toast = state.queue.shift();
    toast.element.style.display = '';
    state.visible.push(toast);

    requestAnimationFrame(() => {
      toast.element.classList.add('is-visible');
    });

    if (toast.options.type !== 'loading' && toast.options.autoDismiss !== false) {
      startDismissTimer(toast.element, toast.id);
    }
  }

  // Public API
  window.Toast = {
    showSuccess(title, description, options = {}) {
      return showToast({ type: 'success', title, description, ...options });
    },

    showError(title, description, options = {}) {
      return showToast({ type: 'error', title, description, ...options });
    },

    showWarning(title, description, options = {}) {
      return showToast({ type: 'warning', title, description, ...options });
    },

    showInfo(title, description, options = {}) {
      return showToast({ type: 'info', title, description, ...options });
    },

    showLoading(title, description, options = {}) {
      return showToast({ type: 'loading', title, description, autoDismiss: false, ...options });
    },

    hide(id) {
      dismissToast(id);
    },

    hideAll() {
      [...state.visible].forEach(toast => dismissToast(toast.id));
      state.queue = [];
    },

    update(id, options) {
      const toast = state.visible.find(t => t.id === id);
      if (!toast) return;

      if (options.title) {
        const titleEl = toast.element.querySelector('.toast__title');
        if (titleEl) titleEl.textContent = options.title;
      }

      if (options.description) {
        const descEl = toast.element.querySelector('.toast__description');
        if (descEl) descEl.textContent = options.description;
      }

      if (options.type) {
        toast.element.className = `toast toast--${options.type} is-visible`;
        const iconEl = toast.element.querySelector('.toast__icon');
        if (iconEl) iconEl.innerHTML = icons[options.type] || icons.info;
      }

      if (options.autoDismiss !== undefined && options.type !== 'loading') {
        if (toast.element._dismissTimer) {
          clearTimeout(toast.element._dismissTimer);
        }
        if (options.autoDismiss) {
          startDismissTimer(toast.element, id);
        }
      }
    }
  };

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initContainer);
  } else {
    initContainer();
  }
})();
