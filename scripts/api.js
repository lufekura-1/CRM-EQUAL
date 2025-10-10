(function () {
  const DEFAULT_BASE_URL = 'http://localhost:4000';
  const ENV_FILE_PATH = './env.front';
  const ENV_KEYS = [
    'VITE_API_BASE_URL',
    'API_BASE_URL',
    'REACT_APP_API_BASE_URL',
    'API_URL',
  ];

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

  function createNetworkError(baseUrl, cause) {
    const hint =
      'Verifique se o backend está em execução (npm run dev dentro de backend/) e se a porta configurada está acessível.';
    const baseMessage = `Não foi possível conectar ao servidor em ${baseUrl}.`;
    const message = `${baseMessage} ${hint}`.trim();
    const error = new Error(message);
    error.cause = cause;
    error.code = 'NETWORK_ERROR';
    error.hint = hint;
    error.baseUrl = baseUrl;
    return error;
  }

  function getFallbackBaseUrl(url) {
    if (!url) {
      return null;
    }

    try {
      const parsed = new URL(url);

      if (parsed.hostname === 'localhost') {
        parsed.hostname = '127.0.0.1';
        return normalizeBaseUrl(parsed.toString());
      }

      if (parsed.hostname === '127.0.0.1') {
        parsed.hostname = 'localhost';
        return normalizeBaseUrl(parsed.toString());
      }
    } catch (error) {
      return null;
    }

    return null;
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

  function buildUrl(path, baseUrl = apiBaseUrl) {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${normalizedPath}`;
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

    const fetchOptions = {
      method,
      headers: requestHeaders,
      body: hasBody ? body : undefined,
    };

    async function tryRequest(baseUrl) {
      const requestUrl = buildUrl(path, baseUrl);
      let parsedBody = null;
      if (hasBody) {
        try {
          parsedBody = JSON.parse(body);
        } catch (parseError) {
          parsedBody = body;
        }
      }

      console.log('[api.request] Enviando requisição.', {
        url: requestUrl,
        method: fetchOptions.method || 'GET',
        body: parsedBody,
      });

      let response;
      try {
        response = await fetch(requestUrl, fetchOptions);
      } catch (networkError) {
        throw createNetworkError(baseUrl, networkError);
      }

      const contentType = response.headers.get('content-type') || '';
      const isJson = contentType.includes('application/json');
      const data = isJson ? await response.json().catch(() => null) : null;

      console.log('[api.request] Resposta recebida.', {
        url: requestUrl,
        method: fetchOptions.method || 'GET',
        status: response.status,
        ok: response.ok,
      });

      if (!response.ok) {
        const message = data?.error || data?.message || `Erro ao comunicar com o servidor (${response.status}).`;
        const error = new Error(message);
        error.status = response.status;
        error.data = data;
        throw error;
      }

      return data;
    }

    const baseUrlsToTry = [apiBaseUrl];
    const fallbackBaseUrl = getFallbackBaseUrl(apiBaseUrl);
    if (fallbackBaseUrl) {
      baseUrlsToTry.push(fallbackBaseUrl);
    }

    const uniqueBaseUrls = [...new Set(baseUrlsToTry)];
    const networkErrors = [];

    for (const baseUrl of uniqueBaseUrls) {
      try {
        const result = await tryRequest(baseUrl);
        if (baseUrl !== apiBaseUrl) {
          apiBaseUrl = baseUrl;
        }
        return result;
      } catch (error) {
        if (error.code === 'NETWORK_ERROR') {
          networkErrors.push(error);
          continue;
        }

        throw error;
      }
    }

    if (networkErrors.length > 0) {
      const attemptedUrls = networkErrors.map((errorItem) => errorItem.baseUrl);
      const hint = networkErrors[0]?.hint || '';
      const joinedUrls = attemptedUrls.join(', ');
      const combinedMessage = `Não foi possível conectar ao servidor nas URLs testadas (${joinedUrls}).${
        hint ? ` ${hint}` : ''
      }`;
      const lastError = networkErrors[networkErrors.length - 1];
      const combinedError = createNetworkError(attemptedUrls[attemptedUrls.length - 1], lastError?.cause);
      combinedError.message = combinedMessage;
      combinedError.attemptedUrls = attemptedUrls;
      throw combinedError;
    }

    throw createNetworkError(apiBaseUrl, new Error('Falha desconhecida ao tentar comunicar com o servidor.'));
  }

  function normalizeEventPayload(payload) {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const result = {};
    function normalizeNullable(value) {
      if (value === undefined) {
        return undefined;
      }
      if (value === null) {
        return null;
      }
      const text = String(value).trim();
      return text.length === 0 ? null : text;
    }

    if (payload.date !== undefined) {
      result.date = payload.date;
    }

    if (payload.title !== undefined) {
      result.title = payload.title;
    }

    if (payload.description !== undefined) {
      result.description = payload.description ?? null;
    }

    if (payload.color !== undefined) {
      result.color = payload.color ?? null;
    }

    if (payload.clientId !== undefined) {
      result.clientId = payload.clientId ?? null;
    }

    const userIdCandidates = [
      payload.userId,
      payload.user_id,
      payload.usuarioId,
      payload.usuario_id,
      payload.user,
      payload.usuario,
      payload.ownerId,
      payload.owner_id,
      payload.responsavelId,
      payload['responsavel_id'],
      payload.responsavel,
      payload.responsibleId,
      payload['responsible_id'],
      payload.responsible,
    ];
    for (let index = 0; index < userIdCandidates.length; index += 1) {
      const normalizedUserId = normalizeNullable(userIdCandidates[index]);
      if (normalizedUserId !== undefined) {
        result.userId = normalizedUserId;
        break;
      }
    }

    if (payload.completed !== undefined) {
      result.completed = Boolean(payload.completed);
    }

    return result;
  }

  function normalizeClientPayload(payload) {
    if (!payload) {
      return null;
    }
    function normalizeNullable(value) {
      if (value === undefined) {
        return undefined;
      }
      if (value === null) {
        return null;
      }
      const stringValue = String(value).trim();
      return stringValue.length === 0 ? null : stringValue;
    }

    function normalizePurchase(purchase) {
      if (!purchase || !purchase.date) {
        return null;
      }

      const normalizedMaterial = normalizeNullable(purchase.frameMaterial);
      const frameValue =
        purchase.frameValue === undefined || purchase.frameValue === null
          ? null
          : Number(purchase.frameValue);
      const lensValue =
        purchase.lensValue === undefined || purchase.lensValue === null
          ? null
          : Number(purchase.lensValue);

      return {
        id: purchase.id ?? purchase.purchaseId ?? null,
        date: purchase.date,
        frame: normalizeNullable(purchase.frame),
        frameMaterial: normalizedMaterial ? normalizedMaterial.toUpperCase() : null,
        frameValue: Number.isNaN(frameValue) ? null : frameValue,
        lens: normalizeNullable(purchase.lens),
        lensValue: Number.isNaN(lensValue) ? null : lensValue,
        invoice: normalizeNullable(purchase.invoice),
        dioptry: {
          oe: {
            spherical: normalizeNullable(purchase.dioptry?.oe?.spherical),
            cylindrical: normalizeNullable(purchase.dioptry?.oe?.cylindrical),
            axis: normalizeNullable(purchase.dioptry?.oe?.axis),
            dnp: normalizeNullable(purchase.dioptry?.oe?.dnp),
            addition: normalizeNullable(purchase.dioptry?.oe?.addition),
          },
          od: {
            spherical: normalizeNullable(purchase.dioptry?.od?.spherical),
            cylindrical: normalizeNullable(purchase.dioptry?.od?.cylindrical),
            axis: normalizeNullable(purchase.dioptry?.od?.axis),
            dnp: normalizeNullable(purchase.dioptry?.od?.dnp),
            addition: normalizeNullable(purchase.dioptry?.od?.addition),
          },
        },
      };
    }

    const result = {};

    if (payload.nome !== undefined) {
      result.nome = String(payload.nome).trim();
    }

    if (payload.telefone !== undefined) {
      result.telefone = normalizeNullable(payload.telefone);
    }

    if (payload.email !== undefined) {
      result.email = normalizeNullable(payload.email);
    }

    if (payload.cpf !== undefined) {
      result.cpf = normalizeNullable(payload.cpf);
    }

    const genderValue =
      payload.gender !== undefined ? payload.gender : payload.genero;
    if (genderValue !== undefined) {
      const normalizedGender = normalizeNullable(genderValue);
      result.gender = normalizedGender ? normalizedGender.toUpperCase() : normalizedGender;
    }

    const birthDateValue =
      payload.birthDate !== undefined
        ? payload.birthDate
        : payload.dataNascimento !== undefined
        ? payload.dataNascimento
        : payload['data_nascimento'];
    if (birthDateValue !== undefined) {
      result.birthDate = normalizeNullable(birthDateValue);
    }

    if (payload.acceptsContact !== undefined) {
      result.acceptsContact = Boolean(payload.acceptsContact);
    } else if (payload.aceitaContato !== undefined) {
      result.acceptsContact = Boolean(payload.aceitaContato);
    } else if (payload['aceita_contato'] !== undefined) {
      result.acceptsContact = Boolean(payload['aceita_contato']);
    }

    const userTypeValue =
      payload.userType !== undefined ? payload.userType : payload.tipoUsuario ?? payload['tipo_usuario'];
    if (userTypeValue !== undefined) {
      const normalizedUserType = normalizeNullable(userTypeValue);
      result.userType = normalizedUserType ? normalizedUserType.toUpperCase() : normalizedUserType;
    }

    const userIdValue =
      payload.userId !== undefined
        ? payload.userId
        : payload.user_id !== undefined
          ? payload.user_id
          : payload.usuarioId !== undefined
            ? payload.usuarioId
            : payload['usuario_id'] !== undefined
              ? payload['usuario_id']
              : payload.usuario !== undefined
                ? payload.usuario
                : payload.user !== undefined
                  ? payload.user
                  : payload.ownerId !== undefined
                    ? payload.ownerId
                    : payload['owner_id'] !== undefined
                      ? payload['owner_id']
                      : payload.responsavelId !== undefined
                        ? payload.responsavelId
                        : payload['responsavel_id'] !== undefined
                          ? payload['responsavel_id']
                          : payload.responsavel !== undefined
                            ? payload.responsavel
                            : payload.responsibleId !== undefined
                              ? payload.responsibleId
                              : payload['responsible_id'] !== undefined
                                ? payload['responsible_id']
                                : payload.responsible;
    if (userIdValue !== undefined) {
      result.userId = normalizeNullable(userIdValue);
    }

    if (Array.isArray(payload.interests)) {
      const normalizedInterests = payload.interests
        .map((item) => normalizeNullable(item))
        .filter((item) => item);
      result.interests = normalizedInterests;
    } else if (payload.interesses === null) {
      result.interests = [];
    } else if (Array.isArray(payload.interesses)) {
      const normalizedInteresses = payload.interesses
        .map((item) => normalizeNullable(item))
        .filter((item) => item);
      result.interests = normalizedInteresses;
    }

    const purchasePayload = payload.purchase ?? payload.compra;
    const normalizedPurchase = normalizePurchase(purchasePayload);
    if (normalizedPurchase) {
      result.purchase = normalizedPurchase;
    }

    const purchasesPayload = payload.purchases ?? payload.compras;
    if (Array.isArray(purchasesPayload)) {
      const normalizedPurchases = purchasesPayload
        .map((item) => normalizePurchase(item))
        .filter((item) => item);
      result.purchases = normalizedPurchases;
    }

    return result;
  }

  const api = {
    resolvePath(path) {
      return buildUrl(path, apiBaseUrl);
    },
    getBaseUrl() {
      return apiBaseUrl;
    },
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
    async updateContact(id, payload) {
      const completedValue = payload?.completed;
      const body = JSON.stringify({ completed: Boolean(completedValue) });
      return request(`/api/contatos/${encodeURIComponent(id)}`, {
        method: 'PATCH',
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
