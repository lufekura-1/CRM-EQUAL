(function initializeDashboard() {
  const homePageElement = document.querySelector('.content__page[data-page="home"]');
  if (!homePageElement) {
    return;
  }

  const valueElements = {
    eventsPending: homePageElement.querySelector('[data-role="dashboard-events-pending"]'),
    clientsTotal: homePageElement.querySelector('[data-role="dashboard-clients-total"]'),
    clientsThisWeek: homePageElement.querySelector('[data-role="dashboard-clients-week"]'),
    contactsWeek: homePageElement.querySelector('[data-role="dashboard-contacts-week"]'),
    contactsMonth: homePageElement.querySelector('[data-role="dashboard-contacts-month"]'),
    contactsCompletedMonth: homePageElement.querySelector('[data-role="dashboard-contacts-completed-month"]'),
    contactsOverdue: homePageElement.querySelector('[data-role="dashboard-contacts-overdue"]'),
  };

  const PLACEHOLDER = '—';
  const numberFormatter = new Intl.NumberFormat('pt-BR');
  const CACHE_TTL_MS = 60 * 1000;
  const MAX_CLIENT_PAGES = 200;

  Object.values(valueElements).forEach((element) => {
    if (element) {
      element.textContent = PLACEHOLDER;
    }
  });

  const STATUS_ALIASES = {
    completed: [
      'completed',
      'complete',
      'done',
      'finished',
      'concluido',
      'concluida',
      'concluidos',
      'concluidas',
      'concluído',
      'concluída',
      'concluídos',
      'concluídas',
      'efetuado',
      'efetuada',
      'efetuados',
      'efetuadas',
      'realizado',
      'realizada',
      'realizados',
      'realizadas',
      'finalizado',
      'finalizada',
      'finalizados',
      'finalizadas',
    ],
    overdue: [
      'overdue',
      'late',
      'atrasado',
      'atrasada',
      'atrasados',
      'atrasadas',
      'vencido',
      'vencida',
      'vencidos',
      'vencidas',
      'em atraso',
      'em_atraso',
    ],
    pending: [
      'pending',
      'pendente',
      'pendentes',
      'aguardando',
      'agendado',
      'agendada',
      'agendados',
      'agendadas',
      'aberto',
      'aberta',
      'abertos',
      'abertas',
      'em aberto',
      'em_aberto',
    ],
  };

  const statusLookup = new Map();
  Object.entries(STATUS_ALIASES).forEach(([statusKey, values]) => {
    values.forEach((value) => {
      const normalized = normalizeToken(value);
      if (normalized) {
        if (!statusLookup.has(normalized)) {
          statusLookup.set(normalized, statusKey);
        }
        const collapsed = collapseToken(normalized);
        if (collapsed && !statusLookup.has(collapsed)) {
          statusLookup.set(collapsed, statusKey);
        }
      }
    });
  });

  const state = {
    isLoading: false,
    queued: false,
    queuedForce: false,
    cachedClients: null,
    cachedEvents: null,
    cacheTimestamp: 0,
    lastRenderedUserKey: '',
    hasRenderedOnce: false,
  };

  function normalizeToken(value) {
    if (value === undefined || value === null) {
      return '';
    }
    const text = String(value).trim();
    if (!text) {
      return '';
    }
    return text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  function collapseToken(token) {
    if (!token) {
      return '';
    }
    return token.replace(/[^a-z0-9]/g, '');
  }

  function addUserToken(map, value, userId) {
    const token = normalizeToken(value);
    if (!token) {
      return;
    }
    if (!map.has(token)) {
      map.set(token, userId);
    }
    const collapsed = collapseToken(token);
    if (collapsed && !map.has(collapsed)) {
      map.set(collapsed, userId);
    }
  }

  function addUserTokenToSet(set, value) {
    const token = normalizeToken(value);
    if (!token) {
      return;
    }
    set.add(token);
    const collapsed = collapseToken(token);
    if (collapsed) {
      set.add(collapsed);
    }
  }

  function createUserMap() {
    const users = typeof window.getUsers === 'function' ? window.getUsers() : [];
    const map = new Map();
    users.forEach((user) => {
      if (!user) {
        return;
      }
      addUserToken(map, user.id, user.id);
      addUserToken(map, user.code, user.id);
      addUserToken(map, user.name, user.id);
      addUserToken(map, user.subtitle, user.id);
    });
    return map;
  }

  function collectCurrentUserContext() {
    const userMap = createUserMap();
    const tokens = new Set();

    let currentUser = null;
    if (typeof window.getCurrentUser === 'function') {
      try {
        currentUser = window.getCurrentUser();
      } catch (error) {
        currentUser = null;
      }
    }

    const rawUserId =
      typeof window.getCurrentUserId === 'function'
        ? window.getCurrentUserId()
        : currentUser?.id ?? '';

    if (currentUser) {
      addUserTokenToSet(tokens, currentUser.id);
      addUserTokenToSet(tokens, currentUser.code);
      addUserTokenToSet(tokens, currentUser.name);
      addUserTokenToSet(tokens, currentUser.subtitle);
    }

    addUserTokenToSet(tokens, rawUserId);

    let targetUserId = '';
    if (currentUser?.id) {
      targetUserId = currentUser.id;
    } else {
      const resolved = resolveUserId(rawUserId, userMap);
      if (resolved) {
        targetUserId = resolved;
      } else {
        const normalized = normalizeToken(rawUserId);
        if (normalized) {
          targetUserId = normalized;
          addUserTokenToSet(tokens, normalized);
        }
      }
    }

    return {
      userMap,
      targetTokens: tokens,
      targetUserId,
      rawUserId,
      currentUser,
    };
  }

  function resolveUserId(value, userMap) {
    const token = normalizeToken(value);
    if (!token) {
      return '';
    }
    const collapsed = collapseToken(token);
    return userMap.get(token) || userMap.get(collapsed) || '';
  }

  function extractEntityUserId(entity, context) {
    if (!entity || typeof entity !== 'object') {
      return '';
    }

    const directFields = [
      'userId',
      'user_id',
      'usuarioId',
      'usuario_id',
      'usuario',
      'user',
      'ownerId',
      'owner_id',
      'owner',
      'responsavelId',
      'responsavel_id',
      'responsavel',
      'responsible',
      'responsibleId',
      'responsible_id',
      'sellerId',
      'seller_id',
      'seller',
      'consultantId',
      'consultant_id',
      'consultant',
      'assignedUserId',
      'assigned_user_id',
      'assignedUser',
      'assigned_user',
      'codigoUsuario',
      'codigo_usuario',
      'userCode',
      'user_code',
      'createdBy',
      'created_by',
      'tipoUsuario',
      'tipo_usuario',
      'userType',
      'atendenteId',
      'atendente_id',
      'atendente',
      'representanteId',
      'representante_id',
      'representante',
      'vendedorId',
      'vendedor_id',
      'vendedor',
    ];

    for (let index = 0; index < directFields.length; index += 1) {
      const field = directFields[index];
      if (!(field in entity)) {
        continue;
      }
      const value = entity[field];
      if (value === undefined || value === null || value === '') {
        continue;
      }
      const resolved = resolveUserId(value, context.userMap);
      if (resolved) {
        return resolved;
      }
      const normalized = normalizeToken(value);
      if (normalized && context.targetTokens?.has(normalized)) {
        return context.targetUserId || normalized;
      }
      const collapsed = collapseToken(normalized);
      if (collapsed && context.targetTokens?.has(collapsed)) {
        return context.targetUserId || collapsed;
      }
    }

    const nestedKeys = [
      'user',
      'usuario',
      'owner',
      'responsavel',
      'responsible',
      'seller',
      'consultant',
      'assignedUser',
      'assigned_user',
      'atendente',
      'representante',
      'vendedor',
    ];

    for (let index = 0; index < nestedKeys.length; index += 1) {
      const key = nestedKeys[index];
      if (entity[key] && typeof entity[key] === 'object') {
        const nested = extractEntityUserId(entity[key], context);
        if (nested) {
          return nested;
        }
      }
    }

    return '';
  }

  function parseDate(value) {
    if (!value) {
      return null;
    }

    if (value instanceof Date) {
      const date = new Date(value.getTime());
      if (Number.isNaN(date.getTime())) {
        return null;
      }
      date.setHours(0, 0, 0, 0);
      return date;
    }

    const text = String(value).trim();
    if (!text) {
      return null;
    }

    const isoMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
    if (isoMatch) {
      const isoDate = new Date(`${isoMatch[1]}T00:00:00`);
      if (!Number.isNaN(isoDate.getTime())) {
        return isoDate;
      }
    }

    const brMatch = text.match(/(\d{2})[\/](\d{2})[\/](\d{4})/);
    if (brMatch) {
      const day = Number(brMatch[1]);
      const month = Number(brMatch[2]) - 1;
      const year = Number(brMatch[3]);
      const brDate = new Date(year, month, day);
      if (!Number.isNaN(brDate.getTime())) {
        brDate.setHours(0, 0, 0, 0);
        return brDate;
      }
    }

    const parsed = new Date(text);
    if (!Number.isNaN(parsed.getTime())) {
      parsed.setHours(0, 0, 0, 0);
      return parsed;
    }

    return null;
  }

  function getStartOfWeekSafe(date) {
    if (typeof getStartOfWeek === 'function') {
      try {
        return getStartOfWeek(date);
      } catch (error) {
        /* ignore */
      }
    }
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const weekday = start.getDay();
    start.setDate(start.getDate() - weekday);
    return start;
  }

  function isWithinRange(date, start, end) {
    if (!date || !start || !end) {
      return false;
    }
    return date >= start && date <= end;
  }

  function isSameMonth(date, reference) {
    if (!date || !reference) {
      return false;
    }
    return date.getFullYear() === reference.getFullYear() && date.getMonth() === reference.getMonth();
  }

  function normalizeStatus(value) {
    const token = normalizeToken(value);
    if (!token) {
      return '';
    }
    const collapsed = collapseToken(token);
    return statusLookup.get(token) || statusLookup.get(collapsed) || '';
  }

  function collectClientContacts(client) {
    const direct = Array.isArray(client?.contacts)
      ? client.contacts
      : Array.isArray(client?.contatos)
        ? client.contatos
        : [];

    const purchases = Array.isArray(client?.purchases)
      ? client.purchases
      : Array.isArray(client?.compras)
        ? client.compras
        : [];

    const nested = [];
    purchases.forEach((purchase) => {
      if (!purchase || typeof purchase !== 'object') {
        return;
      }
      const purchaseContacts = Array.isArray(purchase.contacts)
        ? purchase.contacts
        : Array.isArray(purchase.contatos)
          ? purchase.contatos
          : [];
      if (purchaseContacts.length) {
        nested.push(...purchaseContacts);
      }
    });

    return [...direct, ...nested];
  }

  function normalizeContact(contact, todayStart) {
    if (!contact || typeof contact !== 'object') {
      return null;
    }

    const contactDate = parseDate(
      contact.contactDate ??
        contact.dataContato ??
        contact.data_contato ??
        contact.date ??
        contact.data ??
        contact.agendamento ??
        contact.scheduledFor ??
        contact.scheduled_for
    );

    const completedRaw =
      contact.completed ??
      contact.efetuado ??
      contact.realizado ??
      contact.done ??
      contact.contactCompleted ??
      contact.concluido ??
      contact.concluído ??
      (typeof contact.status === 'string' && normalizeStatus(contact.status) === 'completed');
    const completed = Boolean(completedRaw);

    const completedAt = parseDate(
      contact.completedAt ??
        contact.efetuadoEm ??
        contact.efetuado_em ??
        contact.realizadoEm ??
        contact.realizado_em ??
        contact.dataConclusao ??
        contact.data_conclusao ??
        contact.dataEfetuado ??
        contact.data_efetuado
    );

    const statusCandidates = [
      contact.status,
      contact.statusKey,
      contact.status_key,
      contact.statusLabel,
      contact.status_label,
      contact.situacao,
      contact.situacaoContato,
      contact.situacao_contato,
    ];

    let statusKey = '';
    for (let index = 0; index < statusCandidates.length; index += 1) {
      statusKey = normalizeStatus(statusCandidates[index]);
      if (statusKey) {
        break;
      }
    }

    const effectiveCompletedAt = completedAt || (completed ? contactDate : null);

    if (!statusKey) {
      if (completed) {
        statusKey = 'completed';
      } else if (contactDate && todayStart && contactDate < todayStart) {
        statusKey = 'overdue';
      } else {
        statusKey = 'pending';
      }
    }

    return {
      contactDate,
      completed,
      completedAt: effectiveCompletedAt,
      status: statusKey,
    };
  }

  function normalizeClient(client, context, todayStart) {
    if (!client || typeof client !== 'object') {
      return {
        id: '',
        userId: '',
        createdAt: null,
        contacts: [],
      };
    }

    const idCandidate =
      client.id ??
      client.cliente_id ??
      client.clienteId ??
      client.clientId ??
      client.codigo ??
      client.codigoCliente ??
      client.codigo_cliente ??
      client.uuid ??
      client.guid;
    const id = idCandidate !== undefined && idCandidate !== null ? String(idCandidate) : '';

    const userId = extractEntityUserId(client, context);

    const createdAt = parseDate(
      client.createdAt ??
        client.created_at ??
        client.dataCadastro ??
        client.data_cadastro ??
        client.created ??
        client.createdOn ??
        client.dataCriacao ??
        client.data_criacao
    );

    const contacts = collectClientContacts(client)
      .map((contact) => normalizeContact(contact, todayStart))
      .filter((normalized) => Boolean(normalized));

    return {
      id,
      userId,
      createdAt,
      contacts,
    };
  }

  async function fetchAllClients() {
    if (!window.api || typeof window.api.getClients !== 'function') {
      throw new Error('API de clientes não está disponível.');
    }

    const aggregated = [];
    let page = 1;
    let totalPages = 1;
    const visitedPages = new Set();

    while (page <= totalPages && page <= MAX_CLIENT_PAGES) {
      if (visitedPages.has(page)) {
        break;
      }
      visitedPages.add(page);

      const response = await window.api.getClients({ page });
      const clients = Array.isArray(response?.clientes) ? response.clientes : [];
      aggregated.push(...clients);

      const fetchedTotal = Number(response?.totalPages ?? totalPages);
      if (Number.isFinite(fetchedTotal) && fetchedTotal > 0) {
        totalPages = fetchedTotal;
      }

      if (!Number.isFinite(totalPages) || page >= totalPages) {
        break;
      }

      page += 1;
    }

    return aggregated;
  }

  async function fetchEvents() {
    if (!window.api || typeof window.api.getEvents !== 'function') {
      throw new Error('API de eventos não está disponível.');
    }

    const response = await window.api.getEvents();

    if (Array.isArray(response?.eventos)) {
      return response.eventos;
    }

    if (Array.isArray(response?.events)) {
      return response.events;
    }

    if (Array.isArray(response?.data?.eventos)) {
      return response.data.eventos;
    }

    return Array.isArray(response) ? response : [];
  }

  async function loadData(force = false) {
    const now = Date.now();
    const cacheAge = now - state.cacheTimestamp;

    if (!force && state.cachedClients && state.cachedEvents && cacheAge < CACHE_TTL_MS) {
      return {
        clients: state.cachedClients,
        events: state.cachedEvents,
      };
    }

    const [clients, events] = await Promise.all([fetchAllClients(), fetchEvents()]);
    state.cachedClients = clients;
    state.cachedEvents = events;
    state.cacheTimestamp = Date.now();

    return { clients, events };
  }

  function renderPlaceholders() {
    Object.values(valueElements).forEach((element) => {
      if (element) {
        element.textContent = PLACEHOLDER;
      }
    });
  }

  function setValue(key, value) {
    const element = valueElements[key];
    if (!element) {
      return;
    }

    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      element.textContent = PLACEHOLDER;
      return;
    }

    element.textContent = numberFormatter.format(numeric);
  }

  function renderMetrics(metrics) {
    setValue('eventsPending', metrics.eventsPending);
    setValue('clientsTotal', metrics.clientsTotal);
    setValue('clientsThisWeek', metrics.clientsThisWeek);
    setValue('contactsWeek', metrics.contactsWeek);
    setValue('contactsMonth', metrics.contactsMonth);
    setValue('contactsCompletedMonth', metrics.contactsCompletedMonth);
    setValue('contactsOverdue', metrics.contactsOverdue);
  }

  function computeMetrics(clientsRaw, eventsRaw, context) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfWeek = getStartOfWeekSafe(today);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const normalizedClients = clientsRaw.map((client) => normalizeClient(client, context, today));
    const hasTargetUser = Boolean(context.targetUserId);

    const filteredClients = normalizedClients.filter((client) => {
      if (!hasTargetUser) {
        return true;
      }
      return client.userId && normalizeToken(client.userId) === normalizeToken(context.targetUserId);
    });

    const clientsTotal = filteredClients.length;
    const clientsThisWeek = filteredClients.filter((client) => isWithinRange(client.createdAt, startOfWeek, endOfWeek)).length;

    const contacts = filteredClients.flatMap((client) => client.contacts);
    const pendingContacts = contacts.filter(
      (contact) => contact && !contact.completed && contact.status !== 'completed'
    );

    const contactsWeek = pendingContacts.filter((contact) => isWithinRange(contact.contactDate, startOfWeek, endOfWeek)).length;
    const contactsMonth = pendingContacts.filter((contact) => isWithinRange(contact.contactDate, startOfMonth, endOfMonth)).length;
    const contactsCompletedMonth = contacts.filter((contact) =>
      contact && contact.completed && isSameMonth(contact.completedAt || contact.contactDate, today)
    ).length;
    const contactsOverdue = pendingContacts.filter((contact) => {
      if (!contact) {
        return false;
      }
      if (contact.status === 'overdue') {
        return true;
      }
      return Boolean(contact.contactDate && contact.contactDate < today);
    }).length;

    const clientIdSet = new Set(filteredClients.map((client) => client.id).filter(Boolean));
    const events = Array.isArray(eventsRaw) ? eventsRaw : [];

    const eventsPending = events.reduce((total, event) => {
      if (!event || typeof event !== 'object') {
        return total;
      }

      const eventUserId = extractEntityUserId(event, context);
      const clientIdCandidate =
        event.clientId ??
        event.clienteId ??
        event.cliente_id ??
        event.client_id ??
        event.cliente ??
        event.idCliente ??
        event.id_cliente;
      const eventClientId = clientIdCandidate !== undefined && clientIdCandidate !== null ? String(clientIdCandidate) : '';
      const belongsToClient = eventClientId && clientIdSet.has(eventClientId);

      let includeEvent = true;
      if (hasTargetUser) {
        includeEvent = (eventUserId && normalizeToken(eventUserId) === normalizeToken(context.targetUserId)) || belongsToClient;
      }

      if (!includeEvent) {
        return total;
      }

      const statusInfo = typeof window.getEventStatus === 'function'
        ? window.getEventStatus(event)
        : { key: normalizeStatus(event.status) || 'pending' };

      if ((statusInfo?.key || '').toLowerCase() === 'pending') {
        return total + 1;
      }

      return total;
    }, 0);

    return {
      eventsPending,
      clientsTotal,
      clientsThisWeek,
      contactsWeek,
      contactsMonth,
      contactsCompletedMonth,
      contactsOverdue,
    };
  }

  async function refreshDashboard({ force = false } = {}) {
    if (state.isLoading) {
      state.queued = true;
      state.queuedForce = state.queuedForce || force;
      return;
    }

    state.isLoading = true;

    const context = collectCurrentUserContext();
    const currentUserKey = context.targetUserId || context.rawUserId || '';

    try {
      const { clients, events } = await loadData(force);
      const metrics = computeMetrics(clients, events, context);
      renderMetrics(metrics);
      state.lastRenderedUserKey = currentUserKey;
      state.hasRenderedOnce = true;
    } catch (error) {
      console.error('[dashboard] Não foi possível carregar os indicadores.', error);
      if (!state.hasRenderedOnce) {
        renderPlaceholders();
      }
    } finally {
      state.isLoading = false;
      if (state.queued) {
        const shouldForce = state.queuedForce;
        state.queued = false;
        state.queuedForce = false;
        refreshDashboard({ force: shouldForce });
      }
    }
  }

  document.addEventListener('pagechange', (event) => {
    if (event?.detail?.page === 'home') {
      refreshDashboard({ force: true });
    }
  });

  document.addEventListener('userchange', () => {
    refreshDashboard({ force: true });
  });

  window.requestDashboardRefresh = function requestDashboardRefresh(options = {}) {
    const { force = true } = options || {};
    refreshDashboard({ force });
  };

  refreshDashboard();
})();
