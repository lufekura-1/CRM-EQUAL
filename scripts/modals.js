function toggleBodyModalState() {
  const anyModalVisible = document.querySelector('.modal-overlay.is-visible');
  if (anyModalVisible) {
    document.body.classList.add('modal-open');
  } else {
    document.body.classList.remove('modal-open');
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

function normalizeDateKey(value) {
  if (!value) {
    return null;
  }

  const stringValue = String(value);
  const shortValue = stringValue.slice(0, 10);
  if (shortValue.length === 10 && shortValue.includes('-')) {
    return shortValue;
  }

  const parsed = new Date(stringValue);
  if (!Number.isNaN(parsed.getTime())) {
    return typeof formatDateKey === 'function' ? formatDateKey(parsed) : parsed.toISOString().slice(0, 10);
  }

  return shortValue;
}

const overlayPersistenceObservers = new WeakMap();
const modalOverlayState = {
  activeOverlay: null,
};

function rememberActiveOverlay(overlay) {
  if (!(overlay instanceof HTMLElement)) {
    return;
  }
  modalOverlayState.activeOverlay = overlay;
}

function clearActiveOverlay(overlay) {
  if (modalOverlayState.activeOverlay === overlay) {
    modalOverlayState.activeOverlay = null;
  }
}

function restoreOverlayPosition(overlay, hint = {}) {
  if (!(overlay instanceof HTMLElement)) {
    return;
  }

  const body = document.body;
  if (!body) {
    return;
  }

  const { nextSibling, parentNode } = hint;
  const targetParent = parentNode && parentNode.isConnected ? parentNode : body;

  if (overlay.dataset?.modal) {
    const duplicates = Array.from(
      document.querySelectorAll(`.modal-overlay[data-modal="${overlay.dataset.modal}"]`),
    ).filter((node) => node !== overlay);
    duplicates.forEach((node) => {
      if (node instanceof HTMLElement) {
        node.remove();
      }
    });
  }

  if (nextSibling && nextSibling.parentNode === targetParent) {
    targetParent.insertBefore(overlay, nextSibling);
    return;
  }

  targetParent.appendChild(overlay);
}

function watchOverlayPersistence(overlay) {
  if (!(overlay instanceof HTMLElement)) {
    return;
  }

  if (overlayPersistenceObservers.has(overlay)) {
    return;
  }

  const hint = {
    nextSibling: overlay.nextSibling,
    parentNode: overlay.parentNode,
  };

  const ensurePresence = () => {
    if (!overlay.isConnected) {
      restoreOverlayPosition(overlay, hint);
    }
  };

  const observer = new MutationObserver((mutations) => {
    let shouldRestore = false;

    mutations.forEach((mutation) => {
      if (shouldRestore) {
        return;
      }
      if (Array.from(mutation.removedNodes).includes(overlay)) {
        shouldRestore = true;
      }
    });

    if (shouldRestore) {
      ensurePresence();
    }
  });

  const observeBody = () => {
    if (!document.body) {
      window.requestAnimationFrame(observeBody);
      return;
    }
    observer.observe(document.body, { childList: true });
  };

  observeBody();
  ensurePresence();
  overlayPersistenceObservers.set(overlay, { observer, ensurePresence, hint });
}

function ensureOverlayInDocument(overlay) {
  if (!(overlay instanceof HTMLElement)) {
    return;
  }

  watchOverlayPersistence(overlay);

  if (!overlay.isConnected && document.body) {
    const persistence = overlayPersistenceObservers.get(overlay);
    restoreOverlayPosition(overlay, persistence?.hint);
  }
}

function openOverlay(overlay) {
  if (!overlay) {
    return;
  }
  ensureOverlayInDocument(overlay);
  overlay.classList.add('is-visible');
  overlay.setAttribute('aria-hidden', 'false');
  rememberActiveOverlay(overlay);
  toggleBodyModalState();
}

function closeOverlay(overlay) {
  if (!overlay) {
    return;
  }
  overlay.classList.remove('is-visible');
  overlay.setAttribute('aria-hidden', 'true');
  clearActiveOverlay(overlay);
  toggleBodyModalState();
}

function captureActiveOverlayState() {
  const overlay =
    (modalOverlayState.activeOverlay instanceof HTMLElement
      ? modalOverlayState.activeOverlay
      : document.querySelector('.modal-overlay.is-visible')) || null;

  if (!overlay) {
    return null;
  }

  const persistence = overlayPersistenceObservers.get(overlay);
  const hint = persistence?.hint || {
    nextSibling: overlay.nextSibling,
    parentNode: overlay.parentNode,
  };

  return {
    overlay,
    hint,
    wasVisible: overlay.classList.contains('is-visible'),
  };
}

function restoreActiveOverlayState(state) {
  if (!state || !(state.overlay instanceof HTMLElement)) {
    return;
  }

  const { overlay, hint, wasVisible } = state;
  restoreOverlayPosition(overlay, hint || undefined);

  overlay.classList.toggle('is-visible', Boolean(wasVisible));
  overlay.setAttribute('aria-hidden', wasVisible ? 'false' : 'true');

  if (wasVisible) {
    rememberActiveOverlay(overlay);
  } else {
    clearActiveOverlay(overlay);
  }

  toggleBodyModalState();
}

function isAnyModalVisible() {
  return Boolean(document.querySelector('.modal-overlay.is-visible'));
}

function ensureModalButton(button) {
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }
  if (button.type !== 'button') {
    button.type = 'button';
  }
}

const EVENTS_MANAGER_DEFAULT_FILTERS = ['pending', 'overdue', 'completed'];

const eventsManagerState = {
  isVisible: false,
  statusFilters: new Set(EVENTS_MANAGER_DEFAULT_FILTERS),
  selectedKeys: new Set(),
  monthFilter: '',
  isProcessingDelete: false,
  visibleEvents: new Map(),
};

const WEEK_CONTACT_STATUS_LABELS = {
  completed: 'Efetuado',
  overdue: 'Atrasado',
  pending: 'Pendente',
};

const weekContactsState = {
  list: [],
  range: null,
  isVisible: false,
};

function resetAddEventForm() {
  if (!addEventForm) {
    return;
  }
  addEventForm.reset();
}

function openAddEventModal(eventData = null) {
  if (!addEventForm || !addEventOverlay) {
    return;
  }

  editingEvent = eventData;
  editingEventOriginalDateKey = eventData ? eventData.date : null;

  if (typeof window.clearInlineFeedback === 'function') {
    window.clearInlineFeedback(addEventForm);
  }

  const todayKey = formatDateKey(new Date());
  const dateInput = addEventForm.elements.namedItem('date');
  const titleInput = addEventForm.elements.namedItem('title');
  const descriptionInput = addEventForm.elements.namedItem('description');

  if (dateInput) {
    dateInput.value = eventData ? eventData.date : todayKey;
  }
  if (titleInput) {
    titleInput.value = eventData ? eventData.title : '';
  }
  if (descriptionInput) {
    descriptionInput.value = eventData ? eventData.description : '';
  }

  openOverlay(addEventOverlay);
}

function closeAddEventModal() {
  closeOverlay(addEventOverlay);
  resetAddEventForm();
  editingEvent = null;
  editingEventOriginalDateKey = null;
  if (typeof window.clearInlineFeedback === 'function') {
    window.clearInlineFeedback(addEventForm);
  }
}

function handleAddEventOverlayClick(event) {
  if (!(event.target instanceof Element)) {
    return;
  }

  if (!event.target.closest('.modal')) {
    event.preventDefault();
    event.stopPropagation();
  }
}

function handleAddEventFormSubmit(event) {
  event.preventDefault();
  event.stopPropagation();
  handleSaveEvent();
}
let isSavingEvent = false;

async function handleSaveEvent() {
  if (!addEventForm) {
    return;
  }

  if (!addEventForm.reportValidity()) {
    return;
  }

  if (typeof window.clearInlineFeedback === 'function') {
    window.clearInlineFeedback(addEventForm);
  }

  const formData = new FormData(addEventForm);
  const dateValue = formData.get('date');
  const titleValue = String(formData.get('title') || '').trim();
  const descriptionValue = String(formData.get('description') || '').trim();

  if (!dateValue || !titleValue) {
    return;
  }

  if (isSavingEvent) {
    return;
  }

  const payload = {
    date: dateValue,
    title: titleValue,
    description: descriptionValue || null,
    userId:
      (editingEvent?.userId && String(editingEvent.userId)) ||
      (typeof window.getCurrentUserId === 'function'
        ? String(window.getCurrentUserId() || '')
        : '') || null,
  };

  const isEditing = Boolean(editingEvent);
  const successMessage = isEditing
    ? 'Evento atualizado com sucesso.'
    : 'Evento criado com sucesso.';
  const errorMessage = isEditing
    ? 'Erro ao atualizar o evento.'
    : 'Erro ao criar o evento.';

  const previousDateKey = normalizeDateKey(editingEventOriginalDateKey);

  try {
    isSavingEvent = true;
    if (addEventSaveButton) {
      addEventSaveButton.disabled = true;
    }

    if (isEditing) {
      const response = await window.api.updateEvent(editingEvent.id, payload);
      const updatedEvent = response?.evento || response?.event || response;
      if (updatedEvent && typeof updatedEvent === 'object') {
        editingEvent = { ...editingEvent, ...updatedEvent };
      } else {
        editingEvent = { ...editingEvent, ...payload };
      }
    } else {
      const response = await window.api.createEvent(payload);
      const createdEvent = response?.evento || response?.event || response;
      if (createdEvent && typeof createdEvent === 'object') {
        editingEvent = createdEvent;
      } else {
        editingEvent = { ...payload };
      }
    }

    if (typeof window.showToast === 'function') {
      window.showToast(successMessage, { type: 'success' });
    }

    if (typeof window.showInlineFeedback === 'function') {
      window.showInlineFeedback(addEventForm, successMessage, { type: 'success' });
    }

    if (editingEvent) {
      const nextDateKey = normalizeDateKey(
        editingEvent?.date || editingEvent?.rawDate || payload.date || null,
      );

      if (typeof window.updateCalendarEvent === 'function') {
        const previousKeyForUpdate =
          previousDateKey && previousDateKey !== nextDateKey ? previousDateKey : null;

        try {
          window.updateCalendarEvent(editingEvent, {
            previousDateKey: previousKeyForUpdate,
          });
        } catch (updateError) {
          console.error('[modals] Falha ao sincronizar evento com o calendário.', updateError);
        }
      }

      editingEventOriginalDateKey = nextDateKey || previousDateKey || null;
    }

  } catch (error) {
    const message = window.api?.getErrorMessage(error, errorMessage);
    if (typeof window.showToast === 'function') {
      window.showToast(message, { type: 'error' });
    }
    if (typeof window.showInlineFeedback === 'function') {
      window.showInlineFeedback(addEventForm, message, { type: 'error' });
    }
  } finally {
    if (addEventSaveButton) {
      addEventSaveButton.disabled = false;
    }
    isSavingEvent = false;
  }
}

function normalizeEventsManagerMonth(value) {
  if (!value) {
    return '';
  }

  const text = String(value).trim();
  if (!text) {
    return '';
  }

  if (/^\d{4}-\d{2}$/.test(text)) {
    return text;
  }

  const normalized = normalizeDateKey(text);
  return normalized ? normalized.slice(0, 7) : '';
}

function formatEventsManagerDate(value) {
  const normalized = normalizeDateKey(value);
  if (!normalized) {
    return 'Sem data definida';
  }

  const [year, month, day] = normalized.split('-');
  return `${day}/${month}/${year}`;
}

function getEventsManagerKey(event) {
  if (!event) {
    return '';
  }

  if (typeof window.getCalendarEventKey === 'function') {
    try {
      const key = window.getCalendarEventKey(event);
      if (key) {
        return String(key);
      }
    } catch (error) {
      console.warn('[modals] Falha ao obter identificador do evento.', error);
    }
  }

  const identifier = event.id ?? event.evento_id ?? null;
  return identifier != null ? `event:${String(identifier)}` : '';
}

function syncEventsManagerFilterButtons() {
  if (!eventsManagerFilterButtons) {
    return;
  }

  eventsManagerFilterButtons.forEach((button) => {
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }

    const statusKey = button.dataset.filterStatus;
    if (!statusKey) {
      return;
    }

    const isActive = eventsManagerState.statusFilters.has(statusKey);
    button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
  });
}

function collectEventsManagerItems() {
  const allEvents =
    typeof window.getAllCalendarEvents === 'function' ? window.getAllCalendarEvents() : [];

  if (!Array.isArray(allEvents) || allEvents.length === 0) {
    return [];
  }

  const normalizedMonth = normalizeEventsManagerMonth(eventsManagerState.monthFilter);
  if (normalizedMonth !== eventsManagerState.monthFilter) {
    eventsManagerState.monthFilter = normalizedMonth;
    if (eventsManagerMonthInput) {
      eventsManagerMonthInput.value = normalizedMonth;
    }
  }

  const items = [];

  allEvents.forEach((event) => {
    if (!event || (event.type && event.type !== 'event')) {
      return;
    }

    const status =
      typeof getEventStatus === 'function'
        ? getEventStatus(event)
        : { key: 'pending', label: 'Pendente' };

    if (eventsManagerState.statusFilters.size > 0 && !eventsManagerState.statusFilters.has(status.key)) {
      return;
    }

    const dateKey = normalizeDateKey(event.date ?? event.rawDate ?? '');
    if (normalizedMonth && (!dateKey || !dateKey.startsWith(normalizedMonth))) {
      return;
    }

    const key = getEventsManagerKey(event);
    if (!key) {
      return;
    }

    items.push({
      event,
      status,
      key,
      dateKey,
    });
  });

  return items;
}

function buildEventsManagerCard(item) {
  const { event, status, key, dateKey } = item;
  const card = document.createElement('article');
  card.className = 'events-manager__card';
  card.dataset.eventKey = key;
  card.dataset.statusKey = status.key;
  card.dataset.eventType = event.type || 'event';
  card.dataset.eventId = event.id != null ? String(event.id) : '';
  card.dataset.eventDate = dateKey || '';

  const isSelected = eventsManagerState.selectedKeys.has(key);
  if (isSelected) {
    card.classList.add('is-selected');
  }

  const mainContent = document.createElement('div');
  mainContent.className = 'events-manager__card-main';
  card.appendChild(mainContent);

  const header = document.createElement('div');
  header.className = 'events-manager__card-header';
  mainContent.appendChild(header);

  const selectButton = document.createElement('button');
  selectButton.className = 'events-manager__select-button';
  selectButton.type = 'button';
  selectButton.dataset.role = 'events-manager-select';
  selectButton.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
  selectButton.setAttribute('aria-label', isSelected ? 'Desmarcar evento' : 'Selecionar evento');
  header.appendChild(selectButton);

  const indicator = document.createElement('span');
  indicator.className = 'events-manager__select-indicator';
  selectButton.appendChild(indicator);

  const titleElement = document.createElement('div');
  titleElement.className = 'events-manager__card-title';
  titleElement.textContent = event.title ? String(event.title) : 'Sem título';
  mainContent.appendChild(titleElement);

  const dateElement = document.createElement('span');
  dateElement.className = 'events-manager__card-date';
  dateElement.textContent = formatEventsManagerDate(dateKey || event.date || event.rawDate);
  header.appendChild(dateElement);

  const statusElement = document.createElement('span');
  statusElement.className = `events-manager__card-status events-manager__card-status--${status.key}`;
  statusElement.textContent = status.label;
  mainContent.appendChild(statusElement);

  const descriptionElement = document.createElement('p');
  descriptionElement.className = 'events-manager__card-description';
  const description = event.description ? String(event.description).trim() : '';
  descriptionElement.textContent = description || 'Sem descrição cadastrada.';
  card.appendChild(descriptionElement);

  return card;
}

function renderEventsManagerCards() {
  if (!eventsManagerGrid) {
    return;
  }

  eventsManagerState.visibleEvents.clear();

  while (eventsManagerGrid.firstChild) {
    eventsManagerGrid.removeChild(eventsManagerGrid.firstChild);
  }

  const items = collectEventsManagerItems();

  if (items.length === 0) {
    eventsManagerState.selectedKeys.clear();
    const emptyElement = document.createElement('div');
    emptyElement.className = 'events-manager__empty';
    emptyElement.textContent = eventsManagerState.monthFilter
      ? 'Nenhum evento encontrado para o mês selecionado.'
      : 'Nenhum evento encontrado para os filtros selecionados.';
    eventsManagerGrid.appendChild(emptyElement);
    updateEventsManagerActionButtons();
    return;
  }

  items.forEach((item) => {
    eventsManagerState.visibleEvents.set(item.key, item);
  });

  Array.from(eventsManagerState.selectedKeys).forEach((key) => {
    if (!eventsManagerState.visibleEvents.has(key)) {
      eventsManagerState.selectedKeys.delete(key);
    }
  });

  items.forEach((item) => {
    const card = buildEventsManagerCard(item);
    eventsManagerGrid.appendChild(card);
  });

  updateEventsManagerActionButtons();
}

function updateEventsManagerActionButtons() {
  const selectedKeys = Array.from(eventsManagerState.selectedKeys);
  const selectedCount = selectedKeys.length;
  const singleSelectionKey = selectedCount === 1 ? selectedKeys[0] : '';
  const selectedItem = singleSelectionKey
    ? eventsManagerState.visibleEvents.get(singleSelectionKey)
    : null;
  const canEdit = Boolean(
    selectedItem && selectedItem.event && (selectedItem.event.type || 'event') === 'event',
  );

  if (eventsManagerEditButton) {
    eventsManagerEditButton.disabled = !canEdit;
    eventsManagerEditButton.classList.toggle('is-active', canEdit);
  }

  const canDelete = selectedCount > 0 && !eventsManagerState.isProcessingDelete;
  if (eventsManagerDeleteButton) {
    eventsManagerDeleteButton.disabled = !canDelete;
    eventsManagerDeleteButton.classList.toggle('is-active', canDelete);
  }
}

function openEventsManagerModal() {
  if (!eventsManagerOverlay) {
    return;
  }

  eventsManagerState.isVisible = true;
  eventsManagerState.isProcessingDelete = false;
  eventsManagerState.selectedKeys.clear();

  if (eventsManagerState.statusFilters.size === 0) {
    eventsManagerState.statusFilters = new Set(EVENTS_MANAGER_DEFAULT_FILTERS);
  }

  syncEventsManagerFilterButtons();

  if (eventsManagerMonthInput) {
    eventsManagerMonthInput.value = normalizeEventsManagerMonth(eventsManagerState.monthFilter);
  }

  renderEventsManagerCards();
  openOverlay(eventsManagerOverlay);
}

function closeEventsManagerModal() {
  if (!eventsManagerOverlay) {
    return;
  }

  closeOverlay(eventsManagerOverlay);
  eventsManagerState.isVisible = false;
  eventsManagerState.isProcessingDelete = false;
  eventsManagerState.selectedKeys.clear();
  eventsManagerState.visibleEvents.clear();
  updateEventsManagerActionButtons();
}

function formatLongDate(dateKey) {
  if (!dateKey) {
    return '';
  }
  const normalized = String(dateKey).slice(0, 10);
  const [year, month, day] = normalized.split('-');
  if (!year || !month || !day) {
    return normalized;
  }
  return `${day}/${month}/${year}`;
}

function formatContactTypeLabel(months) {
  const numeric = Number(months);
  if (Number.isFinite(numeric) && numeric > 0) {
    return numeric === 1 ? 'Contato 1 mês' : `Contato ${numeric} meses`;
  }
  return 'Contato';
}

function updateWeekContactsTitle() {
  if (!calendarContactsTitle) {
    return;
  }
  patchElement(calendarContactsTitle, { text: 'Contatos da semana' });
}

function findWeekContactById(contactId) {
  if (!contactId) {
    return null;
  }
  const normalized = String(contactId);
  return (
    weekContactsState.list.find((item) => {
      const id = item?.contactId ?? item?.id;
      return id !== undefined && id !== null && String(id) === normalized;
    }) || null
  );
}

function renderWeekContactsTable({ focusContactId = null } = {}) {
  if (!calendarContactsTableBody) {
    return;
  }

  calendarContactsTableBody.innerHTML = '';

  if (calendarContactsEmptyState) {
    calendarContactsEmptyState.hidden = weekContactsState.list.length > 0;
  }

  if (!weekContactsState.list.length) {
    return;
  }

  let buttonToFocus = null;

  weekContactsState.list.forEach((contact) => {
    const contactId = contact?.contactId ?? contact?.id;
    const contactKey = contactId !== undefined && contactId !== null ? String(contactId) : '';

    const row = document.createElement('tr');
    const clientId = contact?.clientId ?? contact?.cliente_id ?? null;
    if (contactKey) {
      row.dataset.contactId = contactKey;
    }
    if (clientId) {
      row.dataset.clientId = String(clientId);
    }

    const nameCell = document.createElement('td');
    const clientName = contact?.clientName || 'Cliente não informado';
    if (clientId) {
      const nameButton = document.createElement('button');
      nameButton.type = 'button';
      nameButton.className = 'calendar-week-contacts__client-link';
      nameButton.dataset.clientId = String(clientId);
      nameButton.textContent = clientName;
      nameCell.appendChild(nameButton);
    } else {
      nameCell.textContent = clientName;
    }
    row.appendChild(nameCell);

    const phoneCell = document.createElement('td');
    phoneCell.textContent = formatPhoneNumber(contact?.clientPhone);
    row.appendChild(phoneCell);

    const dateCell = document.createElement('td');
    const contactDate = contact?.date ?? contact?.rawDate ?? contact?.contactDate;
    dateCell.textContent = formatLongDate(contactDate) || '—';
    row.appendChild(dateCell);

    const typeCell = document.createElement('td');
    typeCell.textContent = formatContactTypeLabel(contact?.contactMonths ?? contact?.monthsOffset);
    row.appendChild(typeCell);

    const detailCell = document.createElement('td');
    detailCell.className = 'calendar-week-contacts__column--actions';
    const detailButton = document.createElement('button');
    detailButton.type = 'button';
    detailButton.className = 'calendar-week-contacts__detail-button';
    detailButton.dataset.contactId = contactKey;
    detailButton.setAttribute('aria-label', 'Ver detalhes da compra');
    detailButton.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5a9 9 0 1 0 9 9 9.01 9.01 0 0 0-9-9Zm.75 13.5h-1.5v-1.5h1.5Zm0-3h-1.5v-6h1.5Z"></path></svg>';
    detailCell.appendChild(detailButton);
    row.appendChild(detailCell);

    const statusCell = document.createElement('td');
    statusCell.className = 'calendar-week-contacts__column--status';
    const statusButton = document.createElement('button');
    statusButton.type = 'button';
    statusButton.className = 'client-contact-history__status-button calendar-week-contacts__status-button';
    if (contactKey) {
      statusButton.dataset.contactId = contactKey;
    }

    const statusInfo = typeof getEventStatus === 'function'
      ? getEventStatus(contact)
      : { key: contact?.contactCompleted ? 'completed' : 'pending', label: WEEK_CONTACT_STATUS_LABELS.completed };

    const isCompleted = statusInfo.key === 'completed';
    statusButton.dataset.completed = isCompleted ? 'true' : 'false';
    statusButton.dataset.status = statusInfo.key;
    statusButton.setAttribute('role', 'switch');
    statusButton.setAttribute('aria-checked', isCompleted ? 'true' : 'false');
    statusButton.setAttribute(
      'aria-label',
      `Marcar ${formatContactTypeLabel(contact?.contactMonths ?? contact?.monthsOffset)} como ${
        isCompleted ? 'pendente' : 'efetuado'
      }`,
    );
    statusButton.setAttribute('title', statusInfo.label || WEEK_CONTACT_STATUS_LABELS[statusInfo.key] || 'Status');
    statusButton.classList.toggle('is-completed', isCompleted);
    statusButton.classList.toggle('is-overdue', statusInfo.key === 'overdue');

    const switchTrack = document.createElement('span');
    switchTrack.className = 'client-contact-history__status-switch';
    const switchHandle = document.createElement('span');
    switchHandle.className = 'client-contact-history__status-handle';
    switchTrack.appendChild(switchHandle);
    statusButton.appendChild(switchTrack);
    statusCell.appendChild(statusButton);
    row.appendChild(statusCell);

    calendarContactsTableBody.appendChild(row);

    if (focusContactId && contactKey && contactKey === focusContactId) {
      buttonToFocus = statusButton;
    }
  });

  if (buttonToFocus) {
    try {
      buttonToFocus.focus({ preventScroll: true });
    } catch (error) {
      buttonToFocus.focus();
    }
  }
}

function refreshWeekContacts({ focusContactId = null } = {}) {
  if (weekContactsState.isVisible && typeof window.getCurrentWeekRange === 'function') {
    weekContactsState.range = window.getCurrentWeekRange();
  } else if (!weekContactsState.range) {
    weekContactsState.range = typeof window.getCurrentWeekRange === 'function'
      ? window.getCurrentWeekRange()
      : null;
  }

  if (!weekContactsState.range) {
    weekContactsState.list = [];
    renderWeekContactsTable();
    return;
  }

  updateWeekContactsTitle(weekContactsState.range);

  weekContactsState.list = typeof window.getCalendarContactsForRange === 'function'
    ? window.getCalendarContactsForRange(weekContactsState.range)
    : [];

  renderWeekContactsTable({ focusContactId });
}

function openWeekContactsModal() {
  if (!calendarContactsOverlay) {
    return;
  }

  weekContactsState.isVisible = true;
  weekContactsState.range = typeof window.getCurrentWeekRange === 'function'
    ? window.getCurrentWeekRange()
    : null;

  refreshWeekContacts();
  openOverlay(calendarContactsOverlay);
}

function closeWeekContactsModal() {
  if (!calendarContactsOverlay) {
    return;
  }
  closeOverlay(calendarContactsOverlay);
  weekContactsState.isVisible = false;
  weekContactsState.range = null;
  weekContactsState.list = [];
}

function handleWeekContactsOverlayClick(event) {
  if (!(event.target instanceof Element)) {
    return;
  }

  if (!event.target.closest('.modal')) {
    closeWeekContactsModal();
  }
}

function openCalendarContactDetail(contact) {
  if (!calendarContactDetailOverlay || !calendarContactDetailBody) {
    return;
  }

  calendarContactDetailBody.innerHTML = '';

  const purchaseParts = [];

  const purchaseFrame = [
    contact?.purchaseFrame,
    contact?.purchase?.frame,
    contact?.purchase?.armacao,
    contact?.frame,
    contact?.armacao,
  ].find((value) => value !== undefined && value !== null && String(value).trim());

  if (purchaseFrame) {
    purchaseParts.push(`Armação: ${String(purchaseFrame).trim()}`);
  }

  const purchaseLens = [
    contact?.purchaseLens,
    contact?.purchase?.lens,
    contact?.purchase?.lente,
    contact?.lens,
    contact?.lente,
  ].find((value) => value !== undefined && value !== null && String(value).trim());

  if (purchaseLens) {
    purchaseParts.push(`Lente: ${String(purchaseLens).trim()}`);
  }

  const purchaseInfo = purchaseParts.length ? purchaseParts.join(' · ') : 'Não informado';

  const detailSource = [
    contact?.purchaseDetail,
    contact?.detalheCompra,
    contact?.detalhe_compra,
    contact?.purchase?.detail,
    contact?.purchase?.detalheCompra,
    contact?.purchase?.detalhe_compra,
    contact?.purchase?.purchaseDetail,
    contact?.purchase?.purchase_detail,
  ].find((value) => value !== undefined && value !== null && String(value).trim());

  const detailText = detailSource ? String(detailSource).trim() : 'Sem detalhes registrados.';

  const formattedPhone = typeof window.formatPhoneNumber === 'function'
    ? window.formatPhoneNumber(contact?.clientPhone)
    : contact?.clientPhone || 'Não informado';

  const rows = [
    { label: 'Cliente', value: contact?.clientName || 'Não informado' },
    { label: 'Telefone', value: formattedPhone },
    { label: 'Data do contato', value: formatLongDate(contact?.date ?? contact?.rawDate ?? contact?.contactDate) || 'Não informado' },
    { label: 'Tipo do contato', value: formatContactTypeLabel(contact?.contactMonths ?? contact?.monthsOffset) },
    { label: 'Data da compra', value: formatLongDate(contact?.purchaseDate) || 'Não informada' },
    { label: 'Produtos', value: purchaseInfo },
    { label: 'Detalhe da compra', value: detailText },
  ];

  rows.forEach(({ label, value }) => {
    const row = document.createElement('div');
    row.className = 'calendar-contact-detail__row';

    const labelElement = document.createElement('span');
    labelElement.className = 'calendar-contact-detail__label';
    labelElement.textContent = label;

    const valueElement = document.createElement('p');
    valueElement.className = 'calendar-contact-detail__value';
    valueElement.textContent = value;

    row.append(labelElement, valueElement);
    calendarContactDetailBody.appendChild(row);
  });

  openOverlay(calendarContactDetailOverlay);
}

function closeCalendarContactDetail() {
  if (!calendarContactDetailOverlay) {
    return;
  }
  closeOverlay(calendarContactDetailOverlay);
  if (calendarContactDetailBody) {
    calendarContactDetailBody.innerHTML = '';
  }
}

function handleCalendarContactDetailOverlayClick(event) {
  if (!(event.target instanceof Element)) {
    return;
  }
  if (!event.target.closest('.modal')) {
    closeCalendarContactDetail();
  }
}

async function handleWeekContactStatusToggle(button) {
  const contactId = button.dataset.contactId;
  if (!contactId || !window.api?.updateContact) {
    return;
  }

  const isCompleted = button.dataset.completed === 'true';
  const nextValue = !isCompleted;
  const successMessage = nextValue
    ? 'Contato marcado como efetuado.'
    : 'Contato marcado como pendente.';
  const errorMessage = 'Erro ao atualizar o contato.';

  try {
    button.disabled = true;
    const response = await window.api.updateContact(contactId, { completed: nextValue });
    const apiClient = response?.cliente;
    const apiContact = response?.contato ?? null;

    if (apiClient && typeof window.handleContactUpdateResponse === 'function') {
      window.handleContactUpdateResponse(apiClient, { contactId, apiContact });
    }

    if (typeof window.showToast === 'function') {
      window.showToast(successMessage, { type: 'success' });
    }

    refreshWeekContacts({ focusContactId: contactId });
  } catch (error) {
    const message = window.api?.getErrorMessage
      ? window.api.getErrorMessage(error, errorMessage)
      : errorMessage;
    if (typeof window.showToast === 'function') {
      window.showToast(message, { type: 'error' });
    }
    refreshWeekContacts({ focusContactId: contactId });
  } finally {
    button.disabled = false;
  }
}

function handleWeekContactsTableClick(event) {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) {
    return;
  }

  const clientLink = target.closest('.calendar-week-contacts__client-link');
  if (clientLink instanceof HTMLButtonElement) {
    event.preventDefault();
    event.stopPropagation();
    const clientId = clientLink.dataset.clientId;
    if (clientId && typeof window.navigateToClientDetail === 'function') {
      window.navigateToClientDetail(clientId);
      closeWeekContactsModal();
    }
    return;
  }

  const detailButton = target.closest('.calendar-week-contacts__detail-button');
  if (detailButton instanceof HTMLButtonElement) {
    event.preventDefault();
    event.stopPropagation();
    const contactId = detailButton.dataset.contactId;
    const contact = findWeekContactById(contactId);
    if (contact) {
      openCalendarContactDetail(contact);
    }
    return;
  }

  const statusButton = target.closest('.calendar-week-contacts__status-button');
  if (statusButton instanceof HTMLButtonElement) {
    event.preventDefault();
    event.stopPropagation();
    handleWeekContactStatusToggle(statusButton);
  }
}

function handleEventsManagerOverlayClick(event) {
  if (!(event.target instanceof Element)) {
    return;
  }

  if (!event.target.closest('.modal')) {
    event.preventDefault();
    event.stopPropagation();
  }
}

function handleEventsManagerFilterClick(event) {
  const button = event.target instanceof Element
    ? event.target.closest('[data-filter-status]')
    : null;

  if (!(button instanceof HTMLButtonElement)) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const statusKey = button.dataset.filterStatus;
  if (!statusKey) {
    return;
  }

  const isActive = eventsManagerState.statusFilters.has(statusKey);
  if (isActive && eventsManagerState.statusFilters.size === 1) {
    if (typeof window.showToast === 'function') {
      window.showToast('Selecione pelo menos um status.', { type: 'info' });
    }
    return;
  }

  if (isActive) {
    eventsManagerState.statusFilters.delete(statusKey);
  } else {
    eventsManagerState.statusFilters.add(statusKey);
  }

  syncEventsManagerFilterButtons();
  renderEventsManagerCards();
}

function handleEventsManagerMonthChange(event) {
  const input = event.target instanceof HTMLInputElement ? event.target : null;
  if (!input) {
    return;
  }

  eventsManagerState.monthFilter = normalizeEventsManagerMonth(input.value);
  if (eventsManagerState.monthFilter !== input.value) {
    input.value = eventsManagerState.monthFilter;
  }

  renderEventsManagerCards();
}

function toggleEventsManagerSelection(button) {
  if (!(button instanceof HTMLButtonElement) || eventsManagerState.isProcessingDelete) {
    return;
  }

  const card = button.closest('.events-manager__card');
  if (!(card instanceof HTMLElement)) {
    return;
  }

  const key = card.dataset.eventKey;
  if (!key) {
    return;
  }

  if (eventsManagerState.selectedKeys.has(key)) {
    eventsManagerState.selectedKeys.delete(key);
  } else {
    eventsManagerState.selectedKeys.add(key);
  }

  const isSelected = eventsManagerState.selectedKeys.has(key);
  button.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
  button.setAttribute('aria-label', isSelected ? 'Desmarcar evento' : 'Selecionar evento');
  card.classList.toggle('is-selected', isSelected);
  updateEventsManagerActionButtons();
}

function handleEventsManagerGridClick(event) {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) {
    return;
  }

  const toggleButton = target.closest('[data-role="events-manager-select"]');
  if (toggleButton instanceof HTMLButtonElement) {
    event.preventDefault();
    event.stopPropagation();
    toggleEventsManagerSelection(toggleButton);
  }
}

async function handleEventsManagerDelete() {
  if (!eventsManagerDeleteButton || eventsManagerState.isProcessingDelete) {
    return;
  }

  const selectedKeys = Array.from(eventsManagerState.selectedKeys);
  if (selectedKeys.length === 0) {
    return;
  }

  const targets = selectedKeys
    .map((key) => {
      const item = eventsManagerState.visibleEvents.get(key);
      if (!item || !item.event || item.event.id == null) {
        return null;
      }
      return { key, event: item.event };
    })
    .filter(Boolean);

  if (targets.length === 0) {
    if (typeof window.showToast === 'function') {
      window.showToast('Não foi possível identificar os eventos selecionados.', {
        type: 'error',
      });
    }
    return;
  }

  if (!(window.api && typeof window.api.deleteEvent === 'function')) {
    if (typeof window.showToast === 'function') {
      window.showToast('A exclusão de eventos não está disponível no momento.', {
        type: 'error',
      });
    }
    return;
  }

  const confirmationMessage =
    targets.length > 1
      ? `Deseja excluir ${targets.length} eventos selecionados?`
      : 'Deseja excluir o evento selecionado?';

  const confirmed = typeof window.confirm === 'function' ? window.confirm(confirmationMessage) : true;
  if (!confirmed) {
    return;
  }

  eventsManagerState.isProcessingDelete = true;
  updateEventsManagerActionButtons();

  const deletedKeys = [];
  const errors = [];

  for (const target of targets) {
    try {
      await window.api.deleteEvent(target.event.id);
      deletedKeys.push(target.key);
    } catch (error) {
      errors.push(error);
    }
  }

  if (deletedKeys.length > 0) {
    if (typeof window.removeCalendarEvents === 'function') {
      window.removeCalendarEvents(deletedKeys);
    }
    deletedKeys.forEach((key) => eventsManagerState.selectedKeys.delete(key));
  }

  renderEventsManagerCards();

  eventsManagerState.isProcessingDelete = false;
  updateEventsManagerActionButtons();

  if (errors.length > 0) {
    const message = window.api?.getErrorMessage
      ? window.api.getErrorMessage(errors[0], 'Erro ao excluir evento.')
      : 'Erro ao excluir evento.';
    if (typeof window.showToast === 'function') {
      window.showToast(message, { type: 'error' });
    }
    return;
  }

  if (deletedKeys.length > 0 && typeof window.showToast === 'function') {
    const successMessage =
      deletedKeys.length > 1 ? 'Eventos excluídos com sucesso.' : 'Evento excluído com sucesso.';
    window.showToast(successMessage, { type: 'success' });
  }
}

function handleEventsManagerEdit() {
  const selectedKeys = Array.from(eventsManagerState.selectedKeys);
  if (selectedKeys.length !== 1) {
    return;
  }

  const item = eventsManagerState.visibleEvents.get(selectedKeys[0]);
  if (!item || !item.event || (item.event.type || 'event') !== 'event') {
    return;
  }

  closeEventsManagerModal();
  openAddEventModal(item.event);
}

function handleEventsManagerAdd() {
  closeEventsManagerModal();
  openAddEventModal();
}

function handleEventsManagerExternalUpdate() {
  if (!eventsManagerState.isVisible || eventsManagerState.isProcessingDelete) {
    return;
  }

  renderEventsManagerCards();
}

function closeEventDetailsModal() {
  closeOverlay(eventDetailsOverlay);
  if (eventDetailsToggleStatusButton) {
    eventDetailsToggleStatusButton.hidden = true;
    eventDetailsToggleStatusButton.disabled = false;
    eventDetailsToggleStatusButton.dataset.contactId = '';
    eventDetailsToggleStatusButton.dataset.eventId = '';
    eventDetailsToggleStatusButton.dataset.entityType = '';
    eventDetailsToggleStatusButton.dataset.statusKey = '';
  }
  currentDetailEvent = null;
}

const EVENT_DETAILS_ROW_KEYS = [
  'scheduledDate',
  'clientName',
  'clientPhone',
  'purchaseDate',
  'purchaseInfo',
  'purchaseDetail',
  'eventTitle',
  'relatedClient',
  'observation',
];

const eventDetailsRows = new Map();

function ensureEventDetailsRows() {
  if (!eventDetailsBody || eventDetailsRows.size > 0) {
    return;
  }

  EVENT_DETAILS_ROW_KEYS.forEach((key) => {
    const container = document.createElement('div');
    container.className = 'modal__details-row';
    container.dataset.detailKey = key;

    const labelElement = document.createElement('span');
    labelElement.className = 'modal__details-label';
    container.appendChild(labelElement);

    const valueElement = document.createElement('p');
    valueElement.className = 'modal__details-value';
    container.appendChild(valueElement);

    eventDetailsRows.set(key, {
      container,
      labelElement,
      valueElement,
    });

    eventDetailsBody.appendChild(container);
  });
}

function setDetailRowVisibility(row, visible) {
  if (!row) {
    return;
  }

  patchElement(row.container, {
    attributes: {
      hidden: visible ? null : 'hidden',
    },
    dataset: {
      visible: visible ? 'true' : 'false',
    },
  });
}

function updateDetailRow(key, { label, value = '', isEmpty = false, visible = true } = {}) {
  ensureEventDetailsRows();

  const row = eventDetailsRows.get(key);
  if (!row) {
    return;
  }

  if (label !== undefined) {
    patchElement(row.labelElement, { text: `${label}:` });
  }

  patchElement(row.valueElement, {
    text: value,
    classList: {
      toggle: {
        'modal__details-value--empty': Boolean(isEmpty),
      },
    },
  });

  setDetailRowVisibility(row, visible);
}

function resetDetailRowsVisibility() {
  ensureEventDetailsRows();
  eventDetailsRows.forEach((row) => {
    setDetailRowVisibility(row, false);
  });
}

function formatShortDate(dateKey) {
  if (!dateKey) {
    return '';
  }
  const normalized = String(dateKey).slice(0, 10);
  const parts = normalized.split('-');
  if (parts.length !== 3) {
    return normalized;
  }
  const [year, month, day] = parts;
  return `${day}/${month}/${year.slice(-2)}`;
}

function renderEventDetailsView() {
  if (!eventDetailsBody || !currentDetailEvent) {
    return;
  }

  const event = currentDetailEvent;
  const status = typeof getEventStatus === 'function'
    ? getEventStatus(event)
    : { key: 'pending', label: 'Pendente' };

  if (eventDetailsTitleEntity) {
    const entityText = event.type === 'contact' ? 'Detalhes do Contato' : 'Detalhes do Evento';
    patchElement(eventDetailsTitleEntity, { text: entityText });
  }

  if (eventDetailsTitleStatus) {
    const statusModifierClass = `modal__title-status--${status.key}`;
    const statusClassesToRemove = Array.from(eventDetailsTitleStatus.classList).filter((className) =>
      className.startsWith('modal__title-status--') && className !== statusModifierClass
    );
    patchElement(eventDetailsTitleStatus, {
      text: status.label,
      classList: {
        add: ['modal__title-status', statusModifierClass],
        remove: statusClassesToRemove,
      },
      dataset: {
        statusKey: status.key,
      },
    });
  }

  resetDetailRowsVisibility();

  const scheduledDate = event.date ? formatShortDate(event.date) : '';
  if (scheduledDate) {
    const dateLabel = event.type === 'contact' ? 'Data do contato' : 'Data do evento';
    updateDetailRow('scheduledDate', {
      label: dateLabel,
      value: scheduledDate,
      isEmpty: false,
      visible: true,
    });
  }

  if (event.type === 'contact') {
    const clientName = event.clientName || 'Cliente não informado';
    updateDetailRow('clientName', {
      label: 'Nome do cliente',
      value: clientName,
      isEmpty: !event.clientName,
      visible: true,
    });

    const phone = formatPhoneNumber(event.clientPhone);
    updateDetailRow('clientPhone', {
      label: 'Telefone do cliente',
      value: phone,
      isEmpty: phone === 'Não informado',
      visible: true,
    });

    const monthsLabel = typeof formatPostSaleLabel === 'function'
      ? formatPostSaleLabel(event.contactMonths ?? event.monthsOffset)
      : '';
    const purchaseLabel = 'Data da compra';
    const purchaseDate = event.purchaseDate ? formatShortDate(event.purchaseDate) : '';
    const purchaseValue = purchaseDate
      ? `${purchaseDate}${monthsLabel ? ` - ${monthsLabel}` : ''}`
      : 'Não informada';
    updateDetailRow('purchaseDate', {
      label: purchaseLabel,
      value: purchaseValue,
      isEmpty: !purchaseDate,
      visible: true,
    });

    const purchaseParts = [];
    if (event.purchaseFrame) {
      purchaseParts.push(`Armação ${event.purchaseFrame}`);
    }
    if (event.purchaseLens) {
      purchaseParts.push(`Lente ${event.purchaseLens}`);
    }
    const purchaseText = purchaseParts.length
      ? purchaseParts.join(' · ')
      : 'Informações não disponíveis';
    updateDetailRow('purchaseInfo', {
      label: 'Compra do cliente',
      value: purchaseText,
      isEmpty: !purchaseParts.length,
      visible: true,
    });

    const purchaseDetailText = event.purchaseDetail
      ? String(event.purchaseDetail).trim()
      : '';
    updateDetailRow('purchaseDetail', {
      label: 'Detalhe da compra',
      value: purchaseDetailText || 'Sem detalhes registrados.',
      isEmpty: !purchaseDetailText,
      visible: true,
    });
  } else {
    const title = event.title || 'Evento';
    updateDetailRow('eventTitle', {
      label: 'Título do evento',
      value: title,
      isEmpty: !event.title,
      visible: true,
    });

    if (event.clientName) {
      updateDetailRow('relatedClient', {
        label: 'Cliente relacionado',
        value: event.clientName,
        isEmpty: false,
        visible: true,
      });
    }
  }

  const observationSource =
    event.notes ?? event.observacao ?? event.observation ?? event.description ?? '';
  const hasObservation = Boolean(observationSource);
  const observationText = hasObservation
    ? String(observationSource)
    : 'Sem observações registradas.';
  updateDetailRow('observation', {
    label: 'Observação',
    value: observationText,
    isEmpty: !hasObservation,
    visible: true,
  });

  if (eventDetailsToggleStatusButton) {
    const isContact = event.type === 'contact';
    const hasIdentifier = isContact ? Boolean(event.contactId) : Boolean(event.id);
    if (!hasIdentifier) {
      eventDetailsToggleStatusButton.hidden = true;
      eventDetailsToggleStatusButton.disabled = false;
      patchElement(eventDetailsToggleStatusButton, {
        dataset: {
          contactId: '',
          eventId: '',
          entityType: '',
          statusKey: status.key,
        },
        attributes: {
          hidden: 'hidden',
        },
      });
    } else {
      const buttonText =
        status.key === 'completed' ? 'Marcar como Pendente' : 'Marcar como Efetuado';
      eventDetailsToggleStatusButton.hidden = false;
      eventDetailsToggleStatusButton.disabled = false;
      patchElement(eventDetailsToggleStatusButton, {
        text: buttonText,
        dataset: {
          entityType: isContact ? 'contact' : 'event',
          contactId: isContact ? String(event.contactId) : '',
          eventId: String(event.id ?? ''),
          statusKey: status.key,
        },
        attributes: {
          hidden: null,
        },
      });
    }
  }
}
function openEventDetailsModal(event) {
  if (!eventDetailsOverlay || !eventDetailsBody) {
    return;
  }

  currentDetailEvent = event;
  renderEventDetailsView();

  openOverlay(eventDetailsOverlay);
}

function handleEventDetailsOverlayClick(event) {
  if (!(event.target instanceof Element)) {
    return;
  }

  if (!event.target.closest('.modal')) {
    event.preventDefault();
    event.stopPropagation();
  }
}

function handleEventDetailsToggleClick(event) {
  event.preventDefault();
  event.stopPropagation();
  handleToggleStatusFromModal();
}

async function handleToggleStatusFromModal() {
  if (!currentDetailEvent) {
    return;
  }

  const isContact = currentDetailEvent.type === 'contact';
  if (isContact && !currentDetailEvent.contactId) {
    return;
  }
  if (!isContact && !currentDetailEvent.id) {
    return;
  }

  const currentlyCompleted = isContact
    ? Boolean(currentDetailEvent.contactCompleted ?? currentDetailEvent.completed)
    : Boolean(currentDetailEvent.completed);
  const nextValue = !currentlyCompleted;

  const successMessage = isContact
    ? nextValue
      ? 'Contato marcado como efetuado.'
      : 'Contato marcado como pendente.'
    : nextValue
      ? 'Evento marcado como efetuado.'
      : 'Evento marcado como pendente.';
  const errorMessage = isContact ? 'Erro ao atualizar o contato.' : 'Erro ao atualizar o evento.';

  try {
    if (eventDetailsToggleStatusButton) {
      eventDetailsToggleStatusButton.disabled = true;
    }

    if (isContact) {
      const response = await window.api.updateContact(currentDetailEvent.contactId, { completed: nextValue });
      if (response?.contato) {
        const updatedContact = response.contato;
        const completedValue =
          updatedContact.completed ?? updatedContact.efetuado ?? updatedContact.realizado ?? nextValue;
        currentDetailEvent.contactCompleted = Boolean(completedValue);
        currentDetailEvent.completed = currentDetailEvent.contactCompleted;
        if (updatedContact.contactDate ?? updatedContact.data_contato) {
          currentDetailEvent.date = String(updatedContact.contactDate ?? updatedContact.data_contato).slice(0, 10);
        }
        if (updatedContact.purchaseDate ?? updatedContact.data_compra) {
          currentDetailEvent.purchaseDate = String(
            updatedContact.purchaseDate ?? updatedContact.data_compra
          ).slice(0, 10);
        }
      } else {
        currentDetailEvent.contactCompleted = nextValue;
        currentDetailEvent.completed = nextValue;
      }

      const apiContact = response?.contato ?? null;

      if (typeof window.updateCalendarContactEvent === 'function') {
        const calendarContact = apiContact || {
          id: currentDetailEvent.contactId,
          completed: currentDetailEvent.contactCompleted,
          contactDate: currentDetailEvent.date
            ? String(currentDetailEvent.date).slice(0, 10)
            : currentDetailEvent.rawDate
              ? String(currentDetailEvent.rawDate).slice(0, 10)
              : '',
          purchaseDate: currentDetailEvent.purchaseDate
            ? String(currentDetailEvent.purchaseDate).slice(0, 10)
            : currentDetailEvent.dataCompra
                ? String(currentDetailEvent.dataCompra).slice(0, 10)
                : currentDetailEvent.data_compra
                  ? String(currentDetailEvent.data_compra).slice(0, 10)
                  : '',
          monthsOffset:
            currentDetailEvent.contactMonths ?? currentDetailEvent.monthsOffset ?? null,
          purchaseId:
            currentDetailEvent.purchaseId ??
            currentDetailEvent.compraId ??
            currentDetailEvent.compra_id ??
            null,
        };

        if (calendarContact?.id) {
          const calendarClient = response?.cliente ?? null;
          let calendarPurchase = null;
          const purchaseIdentifier =
            calendarContact.purchaseId ??
            calendarContact.compraId ??
            calendarContact.compra_id ??
            null;

          if (purchaseIdentifier && Array.isArray(calendarClient?.purchases)) {
            const normalizedId = String(purchaseIdentifier);
            calendarPurchase =
              calendarClient.purchases.find((item) => String(item.id ?? '') === normalizedId) || null;
          }

          window.updateCalendarContactEvent({
            contact: calendarContact,
            client: calendarClient,
            purchase: calendarPurchase,
          });
        }
      }

      if (typeof window.handleContactUpdateResponse === 'function' && response?.cliente) {
        window.handleContactUpdateResponse(response.cliente, {
          contactId: currentDetailEvent.contactId,
          apiContact,
        });
      }
    } else {
      await window.api.updateEvent(currentDetailEvent.id, { completed: nextValue });
      currentDetailEvent.completed = nextValue;
    }

    renderEventDetailsView();

    if (typeof window.showToast === 'function') {
      window.showToast(successMessage, { type: 'success' });
    }

    if (!isContact && typeof window.updateCalendarEvent === 'function') {
      const dateKey = normalizeDateKey(currentDetailEvent?.date || currentDetailEvent?.rawDate || null);
      window.updateCalendarEvent(currentDetailEvent, {
        previousDateKey: dateKey,
      });
    }
  } catch (error) {
    const message = window.api?.getErrorMessage
      ? window.api.getErrorMessage(error, errorMessage)
      : errorMessage;
    if (typeof window.showToast === 'function') {
      window.showToast(message, { type: 'error' });
    }
  } finally {
    if (eventDetailsToggleStatusButton) {
      eventDetailsToggleStatusButton.disabled = false;
    }
  }
}

function initializeModalInteractions() {
  ensureModalButton(addEventCloseButton);
  ensureModalButton(addEventSaveButton);
  ensureModalButton(eventDetailsCloseButton);
  ensureModalButton(eventDetailsToggleStatusButton);
  ensureModalButton(eventsManagerCloseButton);
  ensureModalButton(eventsManagerEditButton);
  ensureModalButton(eventsManagerDeleteButton);
  ensureModalButton(eventsManagerAddButton);

  addEventOverlay?.addEventListener('click', handleAddEventOverlayClick);
  addEventCloseButton?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeAddEventModal();
  });
  addEventSaveButton?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    handleSaveEvent();
  });
  addEventForm?.addEventListener('submit', handleAddEventFormSubmit);

  eventDetailsOverlay?.addEventListener('click', handleEventDetailsOverlayClick);
  eventDetailsCloseButton?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeEventDetailsModal();
  });
  eventDetailsToggleStatusButton?.addEventListener('click', handleEventDetailsToggleClick);

  eventsManagerOverlay?.addEventListener('click', handleEventsManagerOverlayClick);
  eventsManagerCloseButton?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeEventsManagerModal();
  });
  eventsManagerGrid?.addEventListener('click', handleEventsManagerGridClick);
  eventsManagerEditButton?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    handleEventsManagerEdit();
  });
  eventsManagerDeleteButton?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    handleEventsManagerDelete();
  });
  eventsManagerAddButton?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    handleEventsManagerAdd();
  });

  if (eventsManagerFilterButtons) {
    eventsManagerFilterButtons.forEach((button) => {
      button.addEventListener('click', handleEventsManagerFilterClick);
    });
  }

  if (eventsManagerMonthInput) {
    eventsManagerMonthInput.addEventListener('change', handleEventsManagerMonthChange);
    eventsManagerMonthInput.addEventListener('input', handleEventsManagerMonthChange);
  }

  syncEventsManagerFilterButtons();
}

if (calendarContactsButton) {
  calendarContactsButton.addEventListener('click', openWeekContactsModal);
}

if (calendarContactsCloseButton) {
  calendarContactsCloseButton.addEventListener('click', closeWeekContactsModal);
}

if (calendarContactsOverlay) {
  calendarContactsOverlay.addEventListener('click', handleWeekContactsOverlayClick);
}

if (calendarContactsTableBody) {
  calendarContactsTableBody.addEventListener('click', handleWeekContactsTableClick);
}

if (calendarContactDetailCloseButton) {
  calendarContactDetailCloseButton.addEventListener('click', closeCalendarContactDetail);
}

if (calendarContactDetailOverlay) {
  calendarContactDetailOverlay.addEventListener('click', handleCalendarContactDetailOverlayClick);
}

Array.from(document.querySelectorAll('.modal-overlay')).forEach((overlay) => {
  watchOverlayPersistence(overlay);
});

window.ModalOverlayManager = {
  captureState: captureActiveOverlayState,
  restoreState: restoreActiveOverlayState,
  isAnyModalVisible,
};

window.openAddEventModal = openAddEventModal;
window.closeAddEventModal = closeAddEventModal;
window.openEventDetailsModal = openEventDetailsModal;
window.closeEventDetailsModal = closeEventDetailsModal;
window.openEventsManagerModal = openEventsManagerModal;
window.closeEventsManagerModal = closeEventsManagerModal;

document.addEventListener('calendar:events-updated', () => {
  if (weekContactsState.isVisible) {
    refreshWeekContacts();
  }
});

document.addEventListener('calendar:events-updated', handleEventsManagerExternalUpdate);

initializeModalInteractions();
