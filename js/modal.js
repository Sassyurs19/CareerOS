/* ============================================================
   MODAL DIALOG SYSTEM — For confirmations and destructive actions
   ============================================================ */

(function() {
  'use strict';

  // Modal icons (SVG)
  const icons = {
    danger: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    warning: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    info: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
  };

  // Modal state
  let currentModal = null;
  let previousActiveElement = null;

  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Create modal overlay and content
  function createModal(options) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'modal-title');
    overlay.setAttribute('aria-describedby', 'modal-description');

    const icon = icons[options.variant] || icons.warning;
    const variantClass = options.variant ? `modal--${options.variant}` : '';

    overlay.innerHTML = `
      <div class="modal ${variantClass}">
        ${options.icon !== false ? `<div class="modal__icon">${icon}</div>` : ''}
        <h2 class="modal__title" id="modal-title">${escapeHtml(options.title)}</h2>
        <p class="modal__description" id="modal-description">${escapeHtml(options.description)}</p>
        <div class="modal__actions">
          ${options.actions.map(action => {
            const actionClass = action.variant === 'danger' ? 'modal__action--danger' : '';
            return `<button class="btn btn--${action.variant || 'ghost'} modal__action ${actionClass}" data-action="${action.id}">${escapeHtml(action.label)}</button>`;
          }).join('')}
        </div>
      </div>
    `;

    // Add event listeners
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay && options.closeOnOverlay !== false) {
        closeModal();
      }
    });

    // Action buttons
    options.actions.forEach(action => {
      const btn = overlay.querySelector(`[data-action="${action.id}"]`);
      if (btn && action.handler) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          action.handler();
          if (action.closeOnClick !== false) {
            closeModal();
          }
        });
      }
    });

    // Keyboard navigation
    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && options.closeOnEscape !== false) {
        closeModal();
      }
    });

    return overlay;
  }

  // Show modal
  function showModal(options) {
    // Close existing modal if any
    if (currentModal) {
      closeModal();
    }

    // Store previously focused element for focus restoration
    previousActiveElement = document.activeElement;

    // Create and append modal
    const overlay = createModal(options);
    document.body.appendChild(overlay);
    currentModal = overlay;

    // Prevent body scroll
    document.body.style.overflow = 'hidden';

    // Trigger animation
    requestAnimationFrame(() => {
      overlay.classList.add('is-visible');
    });

    // Focus first action button
    const firstAction = overlay.querySelector('.modal__action');
    if (firstAction) {
      firstAction.focus();
    }

    return {
      close: closeModal,
      update: (newOptions) => updateModal(newOptions)
    };
  }

  // Close modal
  function closeModal() {
    if (!currentModal) return;

    const overlay = currentModal;
    currentModal = null;

    overlay.classList.remove('is-visible');

    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
      document.body.style.overflow = '';
      
      // Restore focus
      if (previousActiveElement && previousActiveElement.focus) {
        previousActiveElement.focus();
      }
    }, 250);
  }

  // Update modal content
  function updateModal(options) {
    if (!currentModal) return;

    if (options.title) {
      const titleEl = currentModal.querySelector('#modal-title');
      if (titleEl) titleEl.textContent = options.title;
    }

    if (options.description) {
      const descEl = currentModal.querySelector('#modal-description');
      if (descEl) descEl.textContent = options.description;
    }
  }

  // Public API
  window.Modal = {
    confirm(options) {
      return showModal({
        variant: 'danger',
        title: options.title || 'Are you sure?',
        description: options.description || 'This action cannot be undone.',
        actions: [
          {
            id: 'cancel',
            label: options.cancelLabel || 'Cancel',
            variant: 'ghost',
            handler: options.onCancel || (() => {}),
            closeOnClick: true
          },
          {
            id: 'confirm',
            label: options.confirmLabel || 'Confirm',
            variant: 'danger',
            handler: options.onConfirm || (() => {}),
            closeOnClick: true
          }
        ],
        closeOnOverlay: options.closeOnOverlay !== false,
        closeOnEscape: options.closeOnEscape !== false,
        icon: options.icon !== false
      });
    },

    alert(options) {
      return showModal({
        variant: options.variant || 'info',
        title: options.title || 'Notice',
        description: options.description || '',
        actions: [
          {
            id: 'ok',
            label: options.okLabel || 'OK',
            variant: 'primary',
            handler: options.onOk || (() => {}),
            closeOnClick: true
          }
        ],
        closeOnOverlay: options.closeOnOverlay !== false,
        closeOnEscape: options.closeOnEscape !== false,
        icon: options.icon !== false
      });
    },

    custom(options) {
      return showModal(options);
    },

    close() {
      closeModal();
    },

    isOpen() {
      return currentModal !== null;
    }
  };

  // Close modal on page unload
  window.addEventListener('beforeunload', () => {
    if (currentModal) {
      closeModal();
    }
  });
})();
