(function (global) {
  const DEFAULT_TIMEOUT = 15000;
  const NETWORK_EVENT = 'network:loading';

  function toError(error, { url, options, response } = {}) {
    if (error instanceof Error) {
      return error;
    }

    const normalized = new Error('Ocorreu um erro desconhecido.');
    normalized.original = error;
    if (url) {
      normalized.url = url;
    }
    if (options) {
      normalized.options = options;
    }
    if (response) {
      normalized.response = response;
    }
    return normalized;
  }

  function parseBody(response, parse) {
    if (parse === false) {
      return Promise.resolve(null);
    }

    const contentType = response.headers.get('content-type') || '';
    const wantsJson = parse === 'json' || (parse === undefined && contentType.includes('application/json'));

    if (wantsJson) {
      return response
        .json()
        .catch(() => null);
    }

    if (parse === 'text') {
      return response.text();
    }

    return Promise.resolve(null);
  }

  function emitLoading(loading, detail) {
    const appState = global.AppState;
    if (appState && typeof appState.notify === 'function') {
      appState.notify(NETWORK_EVENT, { loading, ...detail });
    }

    document.dispatchEvent(
      new CustomEvent(NETWORK_EVENT, {
        detail: { loading, ...detail },
      }),
    );
  }

  async function safeFetch(url, options = {}) {
    const {
      method = 'GET',
      headers,
      body,
      timeout = DEFAULT_TIMEOUT,
      parse = 'json',
      onStart,
      onFinish,
      signal,
      credentials,
    } = options;

    const requestHeaders = new Headers(headers || {});
    const isJsonBody = body && typeof body === 'object' && !(body instanceof FormData) && !(body instanceof Blob);

    if (isJsonBody && !requestHeaders.has('Content-Type')) {
      requestHeaders.set('Content-Type', 'application/json');
    }

    if (!requestHeaders.has('Accept')) {
      requestHeaders.set('Accept', 'application/json');
    }

    const controller = new AbortController();
    if (signal instanceof AbortSignal) {
      if (signal.aborted) {
        controller.abort(signal.reason);
      } else {
        signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
      }
    }

    let timeoutId = null;
    if (Number.isFinite(timeout) && timeout > 0) {
      timeoutId = global.setTimeout(() => {
        controller.abort(new DOMException('Tempo limite atingido.', 'AbortError'));
      }, timeout);
    }

    const fetchOptions = {
      method,
      headers: requestHeaders,
      body: isJsonBody ? JSON.stringify(body) : body,
      signal: controller.signal,
    };

    if (credentials) {
      fetchOptions.credentials = credentials;
    }

    const detail = { url, method };

    try {
      if (typeof onStart === 'function') {
        onStart(detail);
      }
      emitLoading(true, detail);

      let loggedBody = null;
      if (fetchOptions.body !== undefined && fetchOptions.body !== null) {
        if (typeof fetchOptions.body === 'string') {
          try {
            loggedBody = JSON.parse(fetchOptions.body);
          } catch (parseError) {
            loggedBody = fetchOptions.body;
          }
        } else {
          loggedBody = fetchOptions.body;
        }
      }

      console.log('[safeFetch] Enviando requisição.', {
        url,
        method,
        body: loggedBody,
      });

      const response = await global.fetch(url, fetchOptions);
      const data = await parseBody(response, parse);
      const result = Object.freeze({
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data,
      });

      console.log('[safeFetch] Resposta recebida.', {
        url,
        method,
        status: response.status,
        ok: response.ok,
      });

      if (!response.ok) {
        const error = toError(data?.error || data?.message || response.statusText || 'Erro na requisição.', {
          url,
          options,
          response,
        });
        error.status = response.status;
        error.data = data;
        if (typeof global.showError === 'function') {
          global.showError(error);
          error.__toastShown = true;
        }
        throw error;
      }

      return result;
    } catch (cause) {
      const error = toError(cause, { url, options });
      const status =
        (cause && typeof cause.status === 'number' && Number.isFinite(cause.status)
          ? cause.status
          : cause?.response?.status) ?? error.status ?? null;
      const message = error.message || cause?.message || 'Falha na requisição.';

      console.error('[safeFetch] Requisição falhou.', {
        url,
        status,
        message,
        error,
      });
      if (error.name === 'AbortError') {
        error.message = error.message || 'Requisição cancelada.';
      } else if (!error.message) {
        error.message = 'Falha na requisição.';
      }

      if (typeof global.showError === 'function' && !error.__toastShown) {
        global.showError(error);
        error.__toastShown = true;
      }

      throw error;
    } finally {
      if (timeoutId) {
        global.clearTimeout(timeoutId);
      }
      emitLoading(false, detail);
      if (typeof onFinish === 'function') {
        onFinish(detail);
      }
    }
  }

  global.safeFetch = safeFetch;
})(window);
