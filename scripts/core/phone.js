'use strict';

(function setupPhoneUtils(global) {
  if (!global || typeof global !== 'object') {
    return;
  }

  function extractDigits(value) {
    if (value === undefined || value === null) {
      return '';
    }
    return String(value).replace(/\D/g, '');
  }

  function normalizePhoneDigits(value) {
    let digits = extractDigits(value);
    if (!digits) {
      return '';
    }

    if (digits.startsWith('55') && digits.length > 11) {
      digits = digits.slice(2);
    }

    if (digits.length > 11) {
      digits = digits.slice(-11);
    }

    return digits;
  }

  function formatPhoneNumber(value, { fallback = 'Não informado' } = {}) {
    const digits = normalizePhoneDigits(value);
    if (!digits) {
      return fallback;
    }

    if (digits.length < 2) {
      return fallback;
    }

    const areaCode = digits.slice(0, 2);
    const subscriber = digits.slice(2);

    if (!subscriber) {
      return `(${areaCode})`;
    }

    const prefixLength = Math.max(subscriber.length - 4, 0);
    const prefix = prefixLength > 0 ? subscriber.slice(0, prefixLength) : '';
    const suffix = subscriber.slice(-4);

    let formatted = `(${areaCode})`;
    if (prefix) {
      formatted += ` ${prefix}`;
    }

    if (suffix) {
      formatted += prefix ? `-${suffix}` : ` ${suffix}`;
    }

    return formatted.trim();
  }

  function formatPhoneForInput(value) {
    return formatPhoneNumber(value, { fallback: '' });
  }

  const maskedInputs = new WeakSet();

  function attachPhoneInputMask(input) {
    if (!(input instanceof HTMLInputElement)) {
      return;
    }

    if (maskedInputs.has(input)) {
      return;
    }

    input.setAttribute('inputmode', 'tel');
    input.setAttribute('autocomplete', 'tel');
    if (!input.placeholder) {
      input.placeholder = '(00) 00000-0000';
    }

    function getCursorPosition(formatted, digitIndex) {
      if (digitIndex <= 0) {
        return 0;
      }

      let count = 0;
      for (let index = 0; index < formatted.length; index += 1) {
        if (/\d/.test(formatted[index])) {
          count += 1;
          if (count === digitIndex) {
            return index + 1;
          }
        }
      }
      return formatted.length;
    }

    function updateInputValue(digits, digitIndex = digits.length) {
      const normalizedDigits = digits ? normalizePhoneDigits(digits) : '';
      const formatted = formatPhoneForInput(normalizedDigits);
      input.value = formatted;
      input.dataset.phoneDigits = normalizedDigits;
      const cursor = getCursorPosition(formatted, digitIndex);
      try {
        input.setSelectionRange(cursor, cursor);
      } catch (error) {
        // Ignore selection errors for unsupported input types.
      }
    }

    function handleInput() {
      const rawValue = input.value;
      const selectionStart = input.selectionStart ?? rawValue.length;
      const digitsBeforeCursor = normalizePhoneDigits(rawValue.slice(0, selectionStart));
      const digits = normalizePhoneDigits(rawValue);
      updateInputValue(digits, digitsBeforeCursor.length);
    }

    function handleBlur() {
      const digits = normalizePhoneDigits(input.value);
      updateInputValue(digits, digits.length);
    }

    input.addEventListener('input', handleInput);
    input.addEventListener('blur', handleBlur);
    input.addEventListener('change', handleBlur);

    const initialDigits = normalizePhoneDigits(input.value);
    updateInputValue(initialDigits, initialDigits.length);
    maskedInputs.add(input);
  }

  global.normalizePhoneDigits = normalizePhoneDigits;
  global.formatPhoneNumber = formatPhoneNumber;
  global.formatPhoneForInput = formatPhoneForInput;
  global.attachPhoneInputMask = attachPhoneInputMask;
})(window);
