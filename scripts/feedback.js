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
})();
