function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateKey) {
  const [year, month, day] = dateKey.split('-');
  return `${day}/${month}/${year}`;
}

function ensureEventsArray(dateKey) {
  if (!events[dateKey]) {
    events[dateKey] = [];
  }
  return events[dateKey];
}

function sortEventsForDate(eventList) {
  if (!Array.isArray(eventList)) {
    return;
  }

  eventList.sort((a, b) => {
    const dateA = new Date(a.rawDate || `${a.date}T00:00:00`);
    const dateB = new Date(b.rawDate || `${b.date}T00:00:00`);
    const timeA = dateA.getTime();
    const timeB = dateB.getTime();

    if (!Number.isNaN(timeA) && !Number.isNaN(timeB) && timeA !== timeB) {
      return timeA - timeB;
    }

    const titleA = a.title || '';
    const titleB = b.title || '';
    return titleA.localeCompare(titleB);
  });
}

function getStartOfWeek(date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const weekday = start.getDay();
  start.setDate(start.getDate() - weekday);
  return start;
}

function formatWeekRangeLabel(startDate, endDate) {
  const startDay = startDate.getDate();
  const endDay = endDate.getDate();
  const startMonth = MONTH_NAMES[startDate.getMonth()];
  const endMonth = MONTH_NAMES[endDate.getMonth()];
  const startYear = startDate.getFullYear();
  const endYear = endDate.getFullYear();

  if (startYear === endYear && startDate.getMonth() === endDate.getMonth()) {
    return `Semana ${startDay} - ${endDay} de ${startMonth} ${startYear}`;
  }

  return `Semana ${startDay} de ${startMonth} ${startYear} a ${endDay} de ${endMonth} ${endYear}`;
}

let isCalendarLoading = false;

function clearChildren(element) {
  if (!(element instanceof Element)) {
    return;
  }

  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }
}

function patchElement(element, { text, attributes = {}, dataset = {}, classList = {} } = {}) {
  if (!(element instanceof Element)) {
    return element;
  }

  if (text !== undefined && element.textContent !== text) {
    element.textContent = text;
  }

  Object.entries(attributes).forEach(([name, value]) => {
    if (value === null || value === undefined || value === false) {
      element.removeAttribute(name);
    } else {
      const stringValue = String(value);
      if (element.getAttribute(name) !== stringValue) {
        element.setAttribute(name, stringValue);
      }
    }
  });

  Object.entries(dataset).forEach(([name, value]) => {
    if (value === null || value === undefined) {
      delete element.dataset[name];
    } else {
      const stringValue = String(value);
      if (element.dataset[name] !== stringValue) {
        element.dataset[name] = stringValue;
      }
    }
  });

  if (Array.isArray(classList.add)) {
    classList.add.forEach((className) => {
      element.classList.add(className);
    });
  }

  if (Array.isArray(classList.remove)) {
    classList.remove.forEach((className) => {
      element.classList.remove(className);
    });
  }

  if (classList.toggle && typeof classList.toggle === 'object') {
    Object.entries(classList.toggle).forEach(([className, enabled]) => {
      element.classList.toggle(className, Boolean(enabled));
    });
  }

  return element;
}

function findEventInStore(identifier) {
  if (!identifier) {
    return null;
  }

  const normalized = String(identifier);
  const byContact = normalized.startsWith('contact:')
    ? normalized.slice('contact:'.length)
    : null;
  const byEvent = normalized.startsWith('event:')
    ? normalized.slice('event:'.length)
    : normalized;
  const dateKeys = Object.keys(events);

  for (const dateKey of dateKeys) {
    const list = events[dateKey];
    if (!Array.isArray(list) || list.length === 0) {
      continue;
    }

    const index = list.findIndex((item) => {
      if (byContact !== null) {
        return String(item.contactId ?? '') === byContact;
      }

      const eventId = String(item.id ?? '');
      if (eventId && eventId === byEvent) {
        return true;
      }

      const contactId = item.contactId !== undefined && item.contactId !== null
        ? String(item.contactId)
        : '';
      return contactId && contactId === byEvent;
    });
    if (index >= 0) {
      return {
        dateKey,
        index,
        event: list[index],
      };
    }
  }

  return null;
}

function resetEvents() {
  Object.keys(events).forEach((key) => {
    delete events[key];
  });
}

function normalizeEventData(rawEvent) {
  if (!rawEvent) {
    return null;
  }

  const sourceDate = rawEvent.date ?? rawEvent.data ?? '';
  const dateObject = new Date(sourceDate);
  const hasValidDate = !Number.isNaN(dateObject.getTime());
  const dateKey = hasValidDate
    ? formatDateKey(dateObject)
    : String(sourceDate).slice(0, 10);

  if (!dateKey) {
    return null;
  }

  return {
    id: String(rawEvent.id ?? rawEvent.evento_id ?? Date.now()),
    date: dateKey,
    rawDate: sourceDate,
    title: rawEvent.title ?? rawEvent.titulo ?? '',
    description: rawEvent.description ?? rawEvent.descricao ?? '',
    color: rawEvent.color ?? rawEvent.cor ?? '',
    clientId: rawEvent.clientId ?? rawEvent.cliente_id ?? null,
    type: rawEvent.type ?? rawEvent.eventType ?? (String(rawEvent.id ?? '').startsWith('contact-') ? 'contact' : 'event'),
    contactId: rawEvent.contactId ?? rawEvent.contatoId ?? rawEvent.contato_id ?? null,
    contactCompleted: Boolean(rawEvent.contactCompleted ?? rawEvent.completed ?? rawEvent.efetuado),
    contactMonths:
      rawEvent.contactMonths ?? rawEvent.monthsOffset ?? rawEvent.prazoMeses ?? rawEvent.prazo_meses ?? null,
    purchaseId: rawEvent.purchaseId ?? rawEvent.compraId ?? rawEvent.compra_id ?? null,
    purchaseDate: rawEvent.purchaseDate ?? rawEvent.dataCompra ?? rawEvent.data_compra ?? null,
    completed: Boolean(rawEvent.completed ?? rawEvent.eventCompleted ?? rawEvent.efetuado),
    clientName: rawEvent.clientName ?? rawEvent.nomeCliente ?? rawEvent.nome ?? rawEvent.clienteNome ?? '',
    clientPhone: rawEvent.clientPhone ?? rawEvent.telefoneCliente ?? rawEvent.telefone ?? rawEvent.phone ?? '',
    purchaseFrame: rawEvent.purchaseFrame ?? rawEvent.frame ?? rawEvent.armacao ?? '',
    purchaseLens: rawEvent.purchaseLens ?? rawEvent.lens ?? rawEvent.lente ?? '',
  };
}

function populateEvents(eventList) {
  resetEvents();

  if (!Array.isArray(eventList)) {
    return;
  }

  eventList.forEach((item) => {
    const normalized = normalizeEventData(item);
    if (!normalized) {
      return;
    }
    const dateEvents = ensureEventsArray(normalized.date);
    dateEvents.push(normalized);
  });

  Object.keys(events).forEach((dateKey) => {
    sortEventsForDate(events[dateKey]);
  });
}

function getCalendarRange() {
  const referenceDate = new Date(currentCalendarDate);
  if (currentCalendarView === 'week') {
    const start = getStartOfWeek(referenceDate);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return {
      from: formatDateKey(start),
      to: formatDateKey(end),
    };
  }

  const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
  const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0);
  return {
    from: formatDateKey(start),
    to: formatDateKey(end),
  };
}

function showCalendarStatus(message, type = 'info') {
  if (!datesContainer) {
    return;
  }
  clearChildren(datesContainer);
  const statusElement = document.createElement('div');
  statusElement.className = 'calendar__status';
  if (type === 'error') {
    statusElement.classList.add('calendar__status--error');
  }
  statusElement.textContent = message;
  datesContainer.appendChild(statusElement);
}

const EVENTS_ENDPOINT = '/api/eventos';

function resolveApiUrl(path) {
  if (!path) {
    return path;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const api = window.api;

  if (api && typeof api.resolvePath === 'function') {
    return api.resolvePath(normalizedPath);
  }

  if (api && typeof api.getBaseUrl === 'function') {
    const baseUrl = api.getBaseUrl();
    if (baseUrl) {
      const trimmedBase = String(baseUrl).replace(/\/$/, '');
      return `${trimmedBase}${normalizedPath}`;
    }
  }

  return normalizedPath;
}

function buildEventsUrl(range = {}) {
  const params = new URLSearchParams();
  if (range.from) {
    params.set('from', range.from);
  }
  if (range.to) {
    params.set('to', range.to);
  }
  const query = params.toString();
  const path = query ? `${EVENTS_ENDPOINT}?${query}` : EVENTS_ENDPOINT;
  return resolveApiUrl(path);
}

function buildEventDetailUrl(id) {
  if (!id) {
    return resolveApiUrl(EVENTS_ENDPOINT);
  }

  const encodedId = encodeURIComponent(id);
  return resolveApiUrl(`${EVENTS_ENDPOINT}/${encodedId}`);
}

function extractEventsPayload(payload) {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload.eventos)) {
    return payload.eventos;
  }

  if (Array.isArray(payload.events)) {
    return payload.events;
  }

  if (Array.isArray(payload.data)) {
    return payload.data;
  }

  if (Array.isArray(payload.data?.eventos)) {
    return payload.data.eventos;
  }

  if (Array.isArray(payload.data?.events)) {
    return payload.data.events;
  }

  return [];
}

function isDateWithinRange(dateKey, range) {
  if (!dateKey || !range) {
    return false;
  }

  const { from, to } = range;
  if (!from || !to) {
    return false;
  }

  return dateKey >= from && dateKey <= to;
}

function getPendingEventHint() {
  const editingId = editingEvent?.id ?? editingEvent?.evento_id ?? null;
  if (editingId) {
    return {
      kind: 'event',
      id: String(editingId),
      event: editingEvent,
    };
  }

  const detailType = currentDetailEvent?.type;
  if (detailType && detailType !== 'contact') {
    const detailId = currentDetailEvent?.id ?? currentDetailEvent?.evento_id;
    if (detailId) {
      return {
        kind: 'event',
        id: String(detailId),
        event: currentDetailEvent,
      };
    }
  }

  const appState = window.AppState;
  if (appState && typeof appState.getState === 'function') {
    const state = appState.getState();
    if (state?.currentEventId) {
      return {
        kind: 'event',
        id: String(state.currentEventId),
        event: findEventInStore(state.currentEventId)?.event ?? null,
      };
    }
  }

  return null;
}

function applyEventUpdate(event) {
  const normalized = normalizeEventData(event);
  if (!normalized) {
    return false;
  }

  const eventId = normalized.id;
  const existing = findEventInStore(eventId);
  const affectedKeys = new Set();
  let updated = false;

  if (existing && existing.dateKey) {
    const list = events[existing.dateKey];
    if (Array.isArray(list)) {
      list.splice(existing.index, 1);
      if (list.length === 0) {
        delete events[existing.dateKey];
      }
    }
    affectedKeys.add(existing.dateKey);
    updated = true;
  }

  const range = getCalendarRange();
  if (isDateWithinRange(normalized.date, range)) {
    const list = ensureEventsArray(normalized.date);
    const listIndex = list.findIndex((item) => String(item.id) === String(eventId));
    if (listIndex >= 0) {
      list[listIndex] = normalized;
    } else {
      list.push(normalized);
    }
    sortEventsForDate(list);
    affectedKeys.add(normalized.date);
    updated = true;
  }

  affectedKeys.forEach((key) => {
    if (key) {
      renderCalendarCell(key);
      updated = true;
    }
  });

  return updated;
}

function synchronizeCalendarEvent(eventLike) {
  const normalized = normalizeEventData(eventLike);
  if (!normalized) {
    return false;
  }

  return applyEventUpdate(normalized);
}

async function refreshSingleEvent(hint) {
  if (!hint || hint.kind !== 'event' || !hint.id) {
    return false;
  }

  let updatedEvent = null;

  try {
    const url = buildEventDetailUrl(hint.id);
    const response = await safeFetch(url, {
      method: 'GET',
      parse: 'json',
    });
    const payload =
      response?.data?.evento ??
      response?.data?.event ??
      response?.data?.data ??
      response?.data;
    updatedEvent = normalizeEventData(payload);
  } catch (error) {
    console.warn('[calendar] Falha ao buscar evento atualizado.', error);
  }

  if (!updatedEvent) {
    updatedEvent = normalizeEventData(hint.event);
  }

  if (!updatedEvent) {
    return false;
  }

  applyEventUpdate(updatedEvent);
  return true;
}

async function performFullRefresh({ showLoading = true } = {}) {
  if (isCalendarLoading) {
    return;
  }

  const range = getCalendarRange();

  if (showLoading) {
    showCalendarStatus('Carregando eventos...', 'info');
  }

  isCalendarLoading = true;

  const url = buildEventsUrl(range);

  try {
    const response = await safeFetch(url, { method: 'GET', parse: 'json' });
    const payload = response?.data;
    const eventList = extractEventsPayload(payload);
    populateEvents(eventList);
    renderCalendarView();
  } catch (error) {
    console.error('[calendar] Falha ao carregar eventos.', {
      error,
      range,
      url,
    });
    const resolvedMessage = window.api?.getErrorMessage
      ? window.api.getErrorMessage(error, '')
      : error?.message || '';
    const fallbackMessage = 'Não foi possível carregar os eventos.';
    const statusMessage = resolvedMessage || fallbackMessage;

    if (resolvedMessage && typeof window.showToast === 'function') {
      window.showToast(resolvedMessage, { type: 'error' });
    }

    if (Object.keys(events).length > 0) {
      renderCalendarView();
    } else {
      showCalendarStatus(statusMessage, 'error');
    }
  } finally {
    isCalendarLoading = false;
  }
}

async function refreshCalendar(options = {}) {
  if (!datesContainer) {
    return;
  }

  if (options.forceFull) {
    await performFullRefresh(options);
    return;
  }

  if (!datesContainer.children.length) {
    await performFullRefresh(options);
    return;
  }

  const hint = getPendingEventHint();
  if (hint) {
    const updated = await refreshSingleEvent(hint);
    if (updated) {
      return;
    }
  }

  await performFullRefresh(options);
}

function createDateCell(
  content,
  { isEmpty = false, isToday = false, dateKey = '', variant = 'month' } = {},
) {
  const cell = document.createElement('div');
  cell.className = 'calendar__date';
  if (isEmpty) {
    cell.classList.add('calendar__date--empty');
    return cell;
  }

  if (variant === 'week') {
    cell.classList.add('calendar__date--week');
  }

  if (isToday) {
    cell.classList.add('calendar__date--today');
  }

  if (dateKey) {
    cell.dataset.dateKey = dateKey;
  }

  const header = document.createElement('div');
  header.className = 'calendar__date-header';

  const span = document.createElement('span');
  span.className = 'calendar__date-number';
  span.textContent = content;
  header.appendChild(span);

  if (isToday) {
    const todayTag = document.createElement('span');
    todayTag.className = 'calendar__date-today-tag';
    todayTag.textContent = 'HOJE';
    todayTag.setAttribute('aria-label', 'Data de hoje');
    header.appendChild(todayTag);
  }

  cell.appendChild(header);

  const eventsContainer = document.createElement('div');
  eventsContainer.className = 'calendar__date-events';
  cell.appendChild(eventsContainer);
  return cell;
}

function getEventChipLabel(event) {
  if (!event) {
    return '';
  }

  if (event.type === 'contact') {
    const name = event.clientName || event.title || 'Contato';
    const monthsLabel = typeof formatPostSaleLabel === 'function'
      ? formatPostSaleLabel(event.contactMonths ?? event.monthsOffset)
      : '';
    return monthsLabel ? `${name} ${monthsLabel}` : name;
  }

  return event.title || 'Evento';
}

function createStatusDot(typeKey, statusKey) {
  const dot = document.createElement('span');
  dot.className = 'calendar__event-chip-status';
  dot.dataset.dotType = typeKey;
  dot.dataset.dotStatus = statusKey;
  dot.setAttribute('aria-hidden', 'true');
  return dot;
}

function getEventChipType(event) {
  const rawType = typeof event?.type === 'string' ? event.type.toLowerCase() : '';
  if (rawType === 'contact') {
    return 'contact';
  }
  if (rawType === 'folga' || rawType === 'folgas' || rawType === 'dayoff' || rawType === 'day-off') {
    return 'dayoff';
  }
  return 'event';
}

function getEventKey(event) {
  if (!event) {
    return '';
  }

  if (event.type === 'contact' && event.contactId) {
    return `contact:${String(event.contactId)}`;
  }

  const identifier = event.id ?? event.evento_id ?? null;
  return identifier ? `event:${String(identifier)}` : '';
}

function handleEventChipClick(event) {
  const chip = event.currentTarget;
  if (!(chip instanceof HTMLElement)) {
    return;
  }

  const key = chip.dataset.eventKey || chip.dataset.eventId || chip.dataset.contactId;
  if (!key) {
    return;
  }

  const stored = findEventInStore(key);
  if (stored?.event) {
    openEventDetailsModal(stored.event);
  }
}

function updateEventChip(chip, event) {
  if (!(chip instanceof HTMLElement) || !event) {
    return;
  }

  const status = typeof getEventStatus === 'function'
    ? getEventStatus(event)
    : { key: 'pending', label: 'Pendente' };
  const chipType = getEventChipType(event);
  const chipVariant = status.key === 'completed' ? 'completed' : 'pending';
  const labelText = getEventChipLabel(event);
  const accessibleLabel = `${labelText} - ${status.label}`;
  const key = getEventKey(event);

  patchElement(chip, {
    dataset: {
      eventKey: key || null,
      eventId: event.id != null ? String(event.id) : null,
      contactId: event.contactId != null ? String(event.contactId) : null,
      eventType: event.type || 'event',
      chipType,
      chipVariant,
      eventStatus: status.key,
    },
    attributes: {
      'aria-label': accessibleLabel,
      title: accessibleLabel,
      type: 'button',
    },
  });

  const labelElement = chip.querySelector('.calendar__event-chip-label');
  if (labelElement) {
    patchElement(labelElement, { text: labelText });
  }

  const dotElement = chip.querySelector('.calendar__event-chip-status');
  if (dotElement) {
    patchElement(dotElement, {
      dataset: {
        dotType: chipType,
        dotStatus: status.key,
      },
    });
  }
}

function createEventChip(event) {
  const chip = document.createElement('button');
  chip.className = 'calendar__event-chip';
  chip.type = 'button';
  chip.addEventListener('click', handleEventChipClick);

  const labelElement = document.createElement('span');
  labelElement.className = 'calendar__event-chip-label';
  chip.appendChild(labelElement);

  chip.appendChild(createStatusDot(getEventChipType(event), 'pending'));
  updateEventChip(chip, event);
  return chip;
}

function renderEventsForCell(cell, dateKey) {
  const eventsContainer = cell.querySelector('.calendar__date-events');
  if (!eventsContainer) {
    return;
  }

  const existingChips = new Map();
  Array.from(eventsContainer.children).forEach((child) => {
    if (child instanceof HTMLElement) {
      const childKey = child.dataset.eventKey || child.dataset.eventId || child.dataset.contactId || '';
      if (childKey) {
        existingChips.set(childKey, child);
      }
    }
  });

  const dateEvents = events[dateKey] || [];
  const orderedChips = [];

  dateEvents.forEach((event) => {
    const eventKey = getEventKey(event);
    if (!eventKey) {
      return;
    }
    const existingChip = existingChips.get(eventKey) || createEventChip(event);
    updateEventChip(existingChip, event);
    orderedChips.push(existingChip);
    existingChips.delete(eventKey);
  });

  existingChips.forEach((chip) => {
    chip.remove();
  });

  orderedChips.forEach((chip) => {
    eventsContainer.appendChild(chip);
  });
}

function renderCalendarCell(dateKey) {
  if (!datesContainer || !dateKey) {
    return;
  }

  const cell = datesContainer.querySelector(`.calendar__date[data-date-key="${dateKey}"]`);
  if (!cell) {
    return;
  }

  renderEventsForCell(cell, dateKey);
}

function renderMonthlyCalendar() {
  if (!monthLabel || !datesContainer) {
    return;
  }

  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const firstWeekday = firstDayOfMonth.getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  monthLabel.textContent = `${MONTH_NAMES[month]} ${year}`;

  clearChildren(datesContainer);

  for (let i = 0; i < firstWeekday; i += 1) {
    datesContainer.appendChild(createDateCell('', { isEmpty: true }));
  }

  const today = new Date();

  for (let day = 1; day <= totalDays; day += 1) {
    const isToday =
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear();

    const cellDate = new Date(year, month, day);
    const dateKey = formatDateKey(cellDate);
    const cell = createDateCell(day, { isToday, dateKey });
    renderEventsForCell(cell, dateKey);
    datesContainer.appendChild(cell);
  }

  const totalCells = datesContainer.children.length;
  const remainder = totalCells % 7;
  if (remainder !== 0) {
    const emptyCellsToAdd = 7 - remainder;
    for (let i = 0; i < emptyCellsToAdd; i += 1) {
      datesContainer.appendChild(createDateCell('', { isEmpty: true }));
    }
  }
}

function renderWeeklyCalendar() {
  if (!monthLabel || !datesContainer) {
    return;
  }

  const startOfWeek = getStartOfWeek(currentCalendarDate);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  monthLabel.textContent = formatWeekRangeLabel(startOfWeek, endOfWeek);

  clearChildren(datesContainer);

  const today = new Date();

  for (let index = 0; index < 7; index += 1) {
    const cellDate = new Date(startOfWeek);
    cellDate.setDate(startOfWeek.getDate() + index);

    const isToday =
      cellDate.getDate() === today.getDate() &&
      cellDate.getMonth() === today.getMonth() &&
      cellDate.getFullYear() === today.getFullYear();

    const dateKey = formatDateKey(cellDate);
    const cell = createDateCell(cellDate.getDate(), {
      isToday,
      dateKey,
      variant: 'week',
    });

    renderEventsForCell(cell, dateKey);
    datesContainer.appendChild(cell);
  }
}

function updateCalendarViewButtons() {
  if (!calendarViewButtons) {
    return;
  }

  calendarViewButtons.forEach((button) => {
    const { calendarView } = button.dataset;
    if (!calendarView) {
      return;
    }
    button.classList.toggle('is-active', calendarView === currentCalendarView);
  });
}

function renderCalendarView() {
  if (!monthLabel || !datesContainer) {
    return;
  }

  if (calendarElement) {
    calendarElement.classList.toggle('calendar--weekly', currentCalendarView === 'week');
    calendarElement.classList.toggle('calendar--monthly', currentCalendarView === 'month');
    const ariaLabel = currentCalendarView === 'week' ? 'Calendário semanal' : 'Calendário mensal';
    calendarElement.setAttribute('aria-label', ariaLabel);
  }

  if (currentCalendarView === 'week') {
    renderWeeklyCalendar();
  } else {
    renderMonthlyCalendar();
  }

  updateCalendarViewButtons();
}

function changeCalendarPeriod(offset) {
  if (currentCalendarView === 'week') {
    currentCalendarDate.setDate(currentCalendarDate.getDate() + offset * 7);
  } else {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + offset, 1);
  }
  refreshCalendar({ forceFull: true });
}

function setCalendarView(view) {
  if (view !== 'month' && view !== 'week') {
    return;
  }

  if (currentCalendarView === view) {
    return;
  }

  currentCalendarView = view;

  const today = new Date();
  if (currentCalendarView === 'week') {
    currentCalendarDate = getStartOfWeek(today);
  } else {
    currentCalendarDate = new Date(today.getFullYear(), today.getMonth(), 1);
  }

  refreshCalendar({ forceFull: true });
}

window.refreshCalendar = refreshCalendar;
window.updateCalendarEvent = synchronizeCalendarEvent;

function updateCalendarContactEvent({ contact, client, purchase } = {}) {
  if (!contact || !contact.id) {
    return;
  }

  const contactId = String(contact.id);
  let previousDateKey = null;
  let previousEventList = null;
  let previousEventIndex = -1;
  let eventToUpdate = null;

  Object.keys(events).some((dateKey) => {
    const list = events[dateKey];
    if (!Array.isArray(list)) {
      return false;
    }
    const index = list.findIndex((event) => String(event.contactId) === contactId);
    if (index >= 0) {
      previousDateKey = dateKey;
      previousEventList = list;
      previousEventIndex = index;
      eventToUpdate = list[index];
      return true;
    }
    return false;
  });

  if (!eventToUpdate) {
    return;
  }

  const nextDateKeyRaw = contact.contactDate ? String(contact.contactDate).slice(0, 10) : '';
  const nextDateKey = nextDateKeyRaw || eventToUpdate.date || previousDateKey;

  const completed = Boolean(contact.completed);
  eventToUpdate.contactCompleted = completed;
  eventToUpdate.completed = completed;

  if (nextDateKeyRaw) {
    eventToUpdate.date = nextDateKey;
    eventToUpdate.rawDate = contact.contactDate;
  }

  if (contact.purchaseDate) {
    eventToUpdate.purchaseDate = String(contact.purchaseDate).slice(0, 10);
  } else if (purchase?.date) {
    eventToUpdate.purchaseDate = String(purchase.date).slice(0, 10);
  }

  if (Number.isFinite(contact.monthsOffset)) {
    eventToUpdate.contactMonths = contact.monthsOffset;
  }

  if (client?.name) {
    eventToUpdate.clientName = client.name;
  }

  const affectedKeys = new Set();

  if (nextDateKey !== previousDateKey) {
    if (Array.isArray(previousEventList)) {
      previousEventList.splice(previousEventIndex, 1);
      if (previousEventList.length === 0) {
        delete events[previousDateKey];
      } else {
        sortEventsForDate(previousEventList);
      }
    }

    const nextList = ensureEventsArray(nextDateKey);
    nextList.push(eventToUpdate);
    sortEventsForDate(nextList);

    affectedKeys.add(previousDateKey);
    affectedKeys.add(nextDateKey);
  } else if (Array.isArray(previousEventList)) {
    sortEventsForDate(previousEventList);
    affectedKeys.add(previousDateKey);
  }

  affectedKeys.forEach((key) => {
    if (key) {
      renderCalendarCell(key);
    }
  });
}

window.updateCalendarContactEvent = updateCalendarContactEvent;
