'use strict';

(function preventFormReloads() {
  const ATTRIBUTE_NAME = 'preventReload';
  const formsWithGuard = new WeakSet();

  function shouldGuard(form) {
    return form instanceof HTMLFormElement && form.dataset?.[ATTRIBUTE_NAME] === 'true';
  }

  function attachGuard(form) {
    if (!shouldGuard(form) || formsWithGuard.has(form)) {
      return;
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
    });

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
      ? container.querySelectorAll(`form[data-${ATTRIBUTE_NAME}="true"]`)
      : [];
    forms.forEach((form) => attachGuard(form));

    if (container instanceof HTMLFormElement) {
      attachGuard(container);
    } else if (container instanceof Element && container.matches?.(`form[data-${ATTRIBUTE_NAME}="true"]`)) {
      attachGuard(container);
    }
  }

  if (typeof MutationObserver === 'function') {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element || node instanceof DocumentFragment) {
            scan(node);
          }
        });
      }
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      scan();
    });
  } else {
    scan();
  }
})();
