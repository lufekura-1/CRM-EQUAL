(function () {
  const DEFAULT_BASE_URL = 'http://localhost:4000';
  const ENV_FILE_PATH = '.env.front';
  const ENV_KEYS = ['VITE_API_BASE_URL', 'API_BASE_URL', 'REACT_APP_API_BASE_URL'];

  let apiBaseUrl = DEFAULT_BASE_URL;
  let envLoaded = false;
  let envLoadingPromise = null;

  function parseEnv(text) {
    if (!text) {
      return {};
    }

    return text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .reduce((acc, line) => {
        const separatorIndex = line.indexOf('=');
        if (separatorIndex === -1) {
          return acc;
        }
        const key = line.slice(0, separatorIndex).trim();
        const value = line.slice(separatorIndex + 1).trim();
        if (key) {
          acc[key] = value.replace(/^"|"$/g, '').replace(/^'|'$/g, '');
        }
        return acc;
      }, {});
  }

  function normalizeBaseUrl(url) {
    if (!url) {
      return DEFAULT_BASE_URL;
    }
    const trimmed = url.trim();
    if (!trimmed) {
      return DEFAULT_BASE_URL;
    }
    return trimmed.replace(/\/?$/, '');
  }

  async function ensureBaseUrl() {
    if (envLoaded) {
      return apiBaseUrl;
    }

    if (!envLoadingPromise) {
      envLoadingPromise = fetch(ENV_FILE_PATH, { cache: 'no-store' })
        .then((response) => (response.ok ? response.text() : ''))
        .then((text) => {
          const env = parseEnv(text);
          const resolvedKey = ENV_KEYS.find((key) => env[key]);
          if (resolvedKey) {
            apiBaseUrl = normalizeBaseUrl(env[resolvedKey]);
          }
        })
        .catch(() => {
          apiBaseUrl = DEFAULT_BASE_URL;
        })
        .finally(() => {
          envLoaded = true;
        });
    }

    await envLoadingPromise;
    return apiBaseUrl;
  }

  function buildUrl(path) {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${apiBaseUrl}${normalizedPath}`;
  }

  function extractErrorMessage(error, fallback = 'Ocorreu um erro inesperado.') {
    if (!error) {
      return fallback;
    }

    if (typeof error === 'string') {
      return error;
    }

    if (error.message) {
      return error.message;
    }

    if (error.error) {
      return error.error;
    }

    if (error.data?.error) {
      return error.data.error;
    }

    if (error.data?.message) {
      return error.data.message;
    }

    return fallback;
  }

  async function request(path, { method = 'GET', headers = {}, body } = {}) {
    await ensureBaseUrl();

    const requestHeaders = new Headers(headers);
    const hasBody = body !== undefined && body !== null;
    if (hasBody && !requestHeaders.has('Content-Type')) {
      requestHeaders.set('Content-Type', 'application/json');
    }

    let response;
    try {
      response = await fetch(buildUrl(path), {
        method,
        headers: requestHeaders,
        body: hasBody ? body : undefined,
      });
    } catch (networkError) {
      const error = new Error('Não foi possível conectar ao servidor.');
      error.cause = networkError;
      throw error;
    }

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const data = isJson ? await response.json().catch(() => null) : null;

    if (!response.ok) {
      const message = data?.error || data?.message || `Erro ao comunicar com o servidor (${response.status}).`;
      const error = new Error(message);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  function normalizeEventPayload(payload) {
    if (!payload) {
      return null;
    }
    return {
      date: payload.date,
      title: payload.title,
      description: payload.description ?? null,
      color: payload.color ?? null,
      clientId: payload.clientId ?? null,
    };
  }

  function normalizeClientPayload(payload) {
    if (!payload) {
      return null;
    }
    return {
      nome: payload.nome,
      telefone: payload.telefone ?? null,
      email: payload.email ?? null,
    };
  }

  const api = {
    async getEvents(params = {}) {
      await ensureBaseUrl();
      const searchParams = new URLSearchParams();
      if (params.from) {
        searchParams.set('from', params.from);
      }
      if (params.to) {
        searchParams.set('to', params.to);
      }
      const query = searchParams.toString();
      const path = query ? `/api/eventos?${query}` : '/api/eventos';
      return request(path, { method: 'GET' });
    },
    async createEvent(payload) {
      const body = JSON.stringify(normalizeEventPayload(payload));
      return request('/api/eventos', { method: 'POST', body });
    },
    async updateEvent(id, payload) {
      const body = JSON.stringify(normalizeEventPayload(payload));
      return request(`/api/eventos/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body,
      });
    },
    async deleteEvent(id) {
      return request(`/api/eventos/${encodeURIComponent(id)}`, { method: 'DELETE' });
    },
    async getClients(params = {}) {
      await ensureBaseUrl();
      const searchParams = new URLSearchParams();
      if (params.q) {
        searchParams.set('q', params.q);
      }
      if (params.page) {
        searchParams.set('page', params.page);
      }
      const query = searchParams.toString();
      const path = query ? `/api/clientes?${query}` : '/api/clientes';
      return request(path, { method: 'GET' });
    },
    async createClient(payload) {
      const body = JSON.stringify(normalizeClientPayload(payload));
      return request('/api/clientes', { method: 'POST', body });
    },
    async updateClient(id, payload) {
      const body = JSON.stringify(normalizeClientPayload(payload));
      return request(`/api/clientes/${encodeURIComponent(id)}`, {
        method: 'PUT',
        body,
      });
    },
    async deleteClient(id) {
      return request(`/api/clientes/${encodeURIComponent(id)}`, { method: 'DELETE' });
    },
    getErrorMessage: extractErrorMessage,
  };

  window.api = api;
})();
