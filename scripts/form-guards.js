'use strict';

(function preventFormReloads() {
  const ATTRIBUTE_NAME = 'data-prevent-reload';
  const ALLOW_SUBMIT_ATTRIBUTE = 'data-allow-submit';
  const formsWithGuard = new WeakSet();

  function allowsNativeSubmit(form) {
    if (!form.hasAttribute(ALLOW_SUBMIT_ATTRIBUTE)) {
      return false;
    }

    const rawValue = form.getAttribute(ALLOW_SUBMIT_ATTRIBUTE);
    if (rawValue === null) {
      return true;
    }

    const normalized = rawValue.trim().toLowerCase();
    return normalized === '' || normalized === 'true' || normalized === '1';
  }

  function shouldGuard(form) {
    if (!(form instanceof HTMLFormElement)) {
      return false;
    }

    if (allowsNativeSubmit(form)) {
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
      if (!event.defaultPrevented) {
        event.preventDefault();
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      scan();
    });
  } else {
    scan();
  }
})();
