(function () {
  const container = document.createElement('div');
  container.className = 'toast-container';
  document.body.appendChild(container);

  function removeToast(toast) {
    if (!toast) {
      return;
    }
    toast.classList.remove('toast--visible');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }

  function showToast(message, { type = 'info', duration = 4000 } = {}) {
    if (!message) {
      return;
    }

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');

    const text = document.createElement('span');
    text.className = 'toast__message';
    text.textContent = message;
    toast.appendChild(text);

    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'toast__close';
    closeButton.setAttribute('aria-label', 'Fechar notificação');
    closeButton.textContent = '×';
    closeButton.addEventListener('click', () => removeToast(toast));
    toast.appendChild(closeButton);

    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('toast--visible');
    });

    if (duration > 0) {
      setTimeout(() => {
        removeToast(toast);
      }, duration);
    }
  }

  window.showToast = showToast;

  const inlineFeedbackTimeouts = new WeakMap();
  const INLINE_FEEDBACK_SELECTOR = '[data-role="inline-feedback"]';

  function findInlineFeedbackContainer(target) {
    if (!(target instanceof Element)) {
      return null;
    }

    if (target.matches(INLINE_FEEDBACK_SELECTOR)) {
      return target;
    }

    const directChild = target.querySelector(INLINE_FEEDBACK_SELECTOR);
    if (directChild) {
      return directChild;
    }

    if (target.closest) {
      return target.closest(INLINE_FEEDBACK_SELECTOR);
    }

    return null;
  }

  function clearInlineFeedback(target) {
    const container = findInlineFeedbackContainer(target);
    if (!container) {
      return;
    }

    const timeoutId = inlineFeedbackTimeouts.get(container);
    if (timeoutId) {
      clearTimeout(timeoutId);
      inlineFeedbackTimeouts.delete(container);
    }

    container.textContent = '';
    container.classList.remove(
      'inline-feedback--visible',
      'inline-feedback--success',
      'inline-feedback--error',
      'inline-feedback--info',
    );
    container.setAttribute('aria-hidden', 'true');
  }

  function showInlineFeedback(target, message, { type = 'success', duration = 4000 } = {}) {
    if (!message) {
      return;
    }

    const container = findInlineFeedbackContainer(target);
    if (!container) {
      return;
    }

    const timeoutId = inlineFeedbackTimeouts.get(container);
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    container.textContent = message;
    container.classList.remove('inline-feedback--success', 'inline-feedback--error', 'inline-feedback--info');
    container.classList.add(`inline-feedback--${type}`, 'inline-feedback--visible');
    container.setAttribute('aria-hidden', 'false');

    if (duration > 0) {
      const newTimeout = setTimeout(() => {
        container.classList.remove('inline-feedback--visible');
        container.setAttribute('aria-hidden', 'true');
        inlineFeedbackTimeouts.delete(container);
      }, duration);
      inlineFeedbackTimeouts.set(container, newTimeout);
    } else {
      inlineFeedbackTimeouts.delete(container);
    }
  }

  window.showInlineFeedback = showInlineFeedback;
  window.clearInlineFeedback = clearInlineFeedback;
})();
