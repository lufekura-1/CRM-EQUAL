(function (global) {
  const STORAGE_KEY = 'crm-spa-state';
  const PERSISTED_KEYS = new Set([
    'currentView',
    'currentClientId',
    'currentEventId',
    'filters',
    'user',
  ]);

  const defaultState = Object.freeze({
    currentView: 'home',
    currentClientId: null,
    currentEventId: null,
    filters: Object.freeze({}),
    user: null,
  });

  function safeParse(json) {
    if (!json || typeof json !== 'string') {
      return {};
    }

    try {
      const parsed = JSON.parse(json);
      return typeof parsed === 'object' && parsed ? parsed : {};
    } catch (error) {
      console.warn('[state] Falha ao ler sessionStorage.', error);
      return {};
    }
  }

  function readPersistedState() {
    try {
      const storedValue = global.sessionStorage?.getItem(STORAGE_KEY);
      return safeParse(storedValue);
    } catch (error) {
      console.warn('[state] sessionStorage indisponível.', error);
      return {};
    }
  }

  const internalState = {
    ...defaultState,
    ...readPersistedState(),
  };

  const subscribers = new Map();

  function notify(event, payload) {
    const listeners = subscribers.get(event);
    if (!listeners || listeners.size === 0) {
      return;
    }

    listeners.forEach((listener) => {
      try {
        listener(payload);
      } catch (error) {
        console.error(`[state] Listener falhou para evento "${event}".`, error);
      }
    });
  }

  function persistState(keys) {
    const keysToPersist = Array.from(keys).filter((key) => PERSISTED_KEYS.has(key));
    if (keysToPersist.length === 0) {
      return;
    }

    const snapshot = keysToPersist.reduce((acc, key) => {
      acc[key] = internalState[key];
      return acc;
    }, {});

    try {
      const stored = global.sessionStorage?.getItem(STORAGE_KEY);
      const existing = safeParse(stored);
      const merged = { ...existing, ...snapshot };
      global.sessionStorage?.setItem(STORAGE_KEY, JSON.stringify(merged));
    } catch (error) {
      console.warn('[state] Não foi possível salvar o estado.', error);
    }
  }

  function clone(value) {
    if (value === null || typeof value !== 'object') {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map(clone);
    }

    return { ...value };
  }

  function getState(key) {
    if (!key) {
      return clone(internalState);
    }

    return clone(internalState[key]);
  }

  function setState(updates = {}, options = {}) {
    if (!updates || typeof updates !== 'object') {
      return internalState;
    }

    const changedKeys = new Set();

    Object.entries(updates).forEach(([key, value]) => {
      if (!(key in internalState)) {
        return;
      }

      const nextValue = value === undefined ? null : value;
      const currentValue = internalState[key];
      const isSame =
        typeof nextValue === 'object'
          ? JSON.stringify(nextValue) === JSON.stringify(currentValue)
          : nextValue === currentValue;

      if (isSame) {
        return;
      }

      internalState[key] = nextValue;
      changedKeys.add(key);
    });

    if (changedKeys.size === 0) {
      return internalState;
    }

    persistState(changedKeys);

    if (options.silent) {
      return internalState;
    }

    notify('change', { state: getState(), changed: Array.from(changedKeys) });
    changedKeys.forEach((key) => {
      notify(`change:${key}`, {
        key,
        value: getState(key),
      });
    });

    return internalState;
  }

  function subscribe(event, callback) {
    if (!event || typeof callback !== 'function') {
      return () => {};
    }

    if (!subscribers.has(event)) {
      subscribers.set(event, new Set());
    }

    const listeners = subscribers.get(event);
    listeners.add(callback);

    return function unsubscribe() {
      listeners.delete(callback);
      if (listeners.size === 0) {
        subscribers.delete(event);
      }
    };
  }

  const store = Object.freeze({
    getState,
    setState,
    subscribe,
    notify,
    defaultState,
  });

  if (!global.AppState) {
    global.AppState = store;
  } else {
    console.warn('[state] AppState já estava definido. Mantendo instância existente.');
  }
})(window);
