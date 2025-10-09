'use strict';

// TODO: Criar regra ESLint que proíba window.location, modal.hide(), replaceChildren em
// contêineres raiz (#app, .workspace, .modal-overlay) e uso indiscriminado de innerHTML.

(function preventFormReloads() {
  const ATTRIBUTE_NAME = 'data-prevent-reload';
  const formsWithGuard = new WeakSet();

  function shouldGuard(form) {
    if (!(form instanceof HTMLFormElement)) {
      return false;
    }

    if (!form.hasAttribute(ATTRIBUTE_NAME)) {
      return true;
    }

    const rawValue = form.getAttribute(ATTRIBUTE_NAME);
    if (rawValue === null) {
      return true;
    }

    const normalized = rawValue.trim().toLowerCase();
    if (normalized === 'false' || normalized === '0') {
      return false;
    }

    return true;
  }

  function normalizeActionButtons(form) {
    const buttons = form.querySelectorAll('button');
    buttons.forEach((button) => {
      const currentType = button.getAttribute('type');
      const normalized = currentType ? currentType.trim().toLowerCase() : '';
      if (!normalized || normalized === 'submit') {
        button.setAttribute('type', 'button');
      }
    });

    const submitInputs = form.querySelectorAll('input[type="submit"]');
    submitInputs.forEach((input) => {
      input.setAttribute('type', 'button');
    });
  }

  function attachGuard(form) {
    if (!shouldGuard(form) || formsWithGuard.has(form)) {
      return;
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (typeof event.stopPropagation === 'function') {
        event.stopPropagation();
      }
    });

    normalizeActionButtons(form);
    formsWithGuard.add(form);
  }

  function scan(container = document) {
    if (
      !(
        container instanceof Element
        || container instanceof Document
        || container instanceof DocumentFragment
      )
    ) {
      return;
    }

    const forms = typeof container.querySelectorAll === 'function'
      ? container.querySelectorAll('form')
      : [];
    forms.forEach((form) => attachGuard(form));

    if (container instanceof HTMLFormElement) {
      attachGuard(container);
    }
  }

  if (typeof MutationObserver === 'function') {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.target instanceof HTMLFormElement) {
          attachGuard(mutation.target);
          normalizeActionButtons(mutation.target);
        }

        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLFormElement) {
            attachGuard(node);
            normalizeActionButtons(node);
            return;
          }

          if (node instanceof Element || node instanceof DocumentFragment) {
            scan(node);
          }
        });
      }
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  function initializeGuards() {
    scan();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGuards);
  } else {
    initializeGuards();
  }
})();

(function setupClickInterception() {
  function handleClick(event) {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const anchor = target.closest('a[href="#"]');
    if (anchor) {
      event.preventDefault();
      event.stopPropagation();
      console.warn('[guards] Clique em âncora de hash vazio bloqueado.', anchor);
      if (typeof window.showToast === 'function') {
        window.showToast('Ação indisponível no momento.', { type: 'info', duration: 2500 });
      }
      return;
    }

    const actionable = target.closest('[data-action]');
    if (!actionable) {
      return;
    }

    const actionName = actionable.getAttribute('data-action');
    if (typeof actionName !== 'string' || !actionName.trim() || actionName.trim() === '#') {
      event.preventDefault();
      console.warn('[guards] data-action genérico interceptado.', actionable);
      if (typeof window.showToast === 'function') {
        window.showToast('Ação não configurada.', { type: 'warning', duration: 2500 });
      }
    }
  }

  document.addEventListener('click', handleClick, { passive: false });
})();

(function strictNavigationGuard(global) {
  const flag = String(global.SPA_STRICT ?? '').toLowerCase();
  const isStrict = flag === 'true' || flag === '1';
  if (!isStrict) {
    return;
  }

  function logBlocked(action, details) {
    const stack = new Error(`[SPA] Bloqueado: ${action}`).stack;
    console.warn(`[guards] Navegação bloqueada (${action}).`, details);
    if (stack) {
      console.warn(stack);
    }
    if (typeof global.showToast === 'function') {
      global.showToast('Navegação bloqueada no modo SPA estrito.', {
        type: 'warning',
        duration: 4000,
      });
    }
  }

  try {
    if (global.location) {
      const originalReload = global.location.reload?.bind(global.location);
      if (originalReload) {
        Object.defineProperty(global.location, 'reload', {
          value: function blockedReload(...args) {
            logBlocked('location.reload', args);
            return undefined;
          },
          configurable: true,
          writable: false,
        });
      }

      const locationPrototype = global.Location?.prototype;
      const hrefDescriptor = locationPrototype
        ? Object.getOwnPropertyDescriptor(locationPrototype, 'href')
        : null;

      if (hrefDescriptor && typeof hrefDescriptor.set === 'function') {
        Object.defineProperty(locationPrototype, 'href', {
          ...hrefDescriptor,
          set(value) {
            logBlocked('location.href', value);
          },
        });
      }
    }
  } catch (error) {
    console.warn('[guards] Falha ao reforçar restrições de location.', error);
  }

  if (global.history && typeof global.history.go === 'function') {
    const originalGo = global.history.go.bind(global.history);
    global.history.go = function blockedHistoryGo(...args) {
      logBlocked('history.go', args);
      return undefined;
    };
    global.history.go.original = originalGo;
  }
})(window);
