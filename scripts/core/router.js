(function (global) {
  const ROUTE_EVENT = 'route:change';
  const DEFAULT_VIEW = 'home';

  const routes = [
    {
      name: 'clientes',
      pattern: /^#\/?clientes\/([^/]+)$/i,
      resolve(matches) {
        const clientId = decodeURIComponent(matches[1] || '');
        return {
          view: 'clientes',
          params: { clientId },
          state: {
            currentView: 'clientes',
            currentClientId: clientId,
            currentEventId: null,
          },
        };
      },
    },
    {
      name: 'calendario',
      pattern: /^#\/?calendario(?:\/eventos\/([^/]+))?$/i,
      resolve(matches) {
        const eventId = matches[1] ? decodeURIComponent(matches[1]) : null;
        return {
          view: 'calendario',
          params: { eventId },
          state: {
            currentView: 'calendario',
            currentEventId: eventId,
          },
        };
      },
    },
  ];

  function createRouteResult(hash) {
    if (!hash) {
      return {
        name: DEFAULT_VIEW,
        view: DEFAULT_VIEW,
        params: {},
        state: { currentView: DEFAULT_VIEW },
      };
    }

    for (const route of routes) {
      const matches = hash.match(route.pattern);
      if (matches) {
        const result = route.resolve(matches) || {};
        return {
          name: route.name,
          view: result.view || route.name,
          params: result.params || {},
          state: result.state || {},
        };
      }
    }

    return {
      name: DEFAULT_VIEW,
      view: DEFAULT_VIEW,
      params: {},
      state: { currentView: DEFAULT_VIEW },
    };
  }

  function emitRoute(result) {
    const appState = global.AppState;
    if (appState && typeof appState.setState === 'function') {
      appState.setState(result.state || {});
    }

    if (appState && typeof appState.notify === 'function') {
      appState.notify(ROUTE_EVENT, result);
    }

    document.dispatchEvent(
      new CustomEvent(ROUTE_EVENT, {
        detail: result,
      }),
    );
  }

  function handleRouteChange() {
    const hash = global.location.hash || '';
    const result = createRouteResult(hash);
    emitRoute(result);
  }

  function normalizeHashFromState(state) {
    const view = state.currentView || DEFAULT_VIEW;
    if (view === 'clientes' && state.currentClientId) {
      return `#/clientes/${encodeURIComponent(state.currentClientId)}`;
    }
    if (view === 'calendario') {
      if (state.currentEventId) {
        return `#/calendario/eventos/${encodeURIComponent(state.currentEventId)}`;
      }
      return '#/calendario';
    }
    if (view && view !== DEFAULT_VIEW) {
      return `#/${view}`;
    }
    return '#/';
  }

  function syncHashWithState() {
    const appState = global.AppState;
    if (!appState || typeof appState.getState !== 'function') {
      return;
    }

    const state = appState.getState();
    const nextHash = normalizeHashFromState(state);
    if (global.location.hash !== nextHash) {
      global.location.hash = nextHash;
    }
  }

  function setupStateListener() {
    const appState = global.AppState;
    if (!appState || typeof appState.subscribe !== 'function') {
      return;
    }

    appState.subscribe('change:currentView', syncHashWithState);
    appState.subscribe('change:currentClientId', syncHashWithState);
    appState.subscribe('change:currentEventId', syncHashWithState);
  }

  function init() {
    setupStateListener();
    if (!global.location.hash) {
      syncHashWithState();
    } else {
      handleRouteChange();
    }
  }

  global.SPARouter = Object.freeze({
    init,
    handleRouteChange,
  });

  global.addEventListener('hashchange', handleRouteChange);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
