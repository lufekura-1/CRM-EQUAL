'use strict';

(function preventFormReloads() {
  const ATTRIBUTE_NAME = 'data-prevent-reload';
  const formsWithGuard = new WeakSet();

  function shouldGuard(form) {
    if (!(form instanceof HTMLFormElement)) {
      return false;
    }

    if (!form.hasAttribute(ATTRIBUTE_NAME)) {
      return false;
    }

    const rawValue = form.getAttribute(ATTRIBUTE_NAME);
    if (rawValue === null) {
      return false;
    }

    const normalized = rawValue.trim().toLowerCase();
    if (normalized === 'false' || normalized === '0') {
      return false;
    }

    return true;
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
      ? container.querySelectorAll(`form[${ATTRIBUTE_NAME}]`)
      : [];
    forms.forEach((form) => attachGuard(form));

    if (container instanceof HTMLFormElement) {
      attachGuard(container);
    } else if (container instanceof Element && container.matches?.(`form[${ATTRIBUTE_NAME}]`)) {
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
