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

function openOverlay(overlay) {
  if (!overlay) {
    return;
  }
  overlay.classList.add('is-visible');
  overlay.setAttribute('aria-hidden', 'false');
  toggleBodyModalState();
}

function closeOverlay(overlay) {
  if (!overlay) {
    return;
  }
  overlay.classList.remove('is-visible');
  overlay.setAttribute('aria-hidden', 'true');
  toggleBodyModalState();
}

function ensureModalButton(button) {
  if (!(button instanceof HTMLButtonElement)) {
    return;
  }
  if (button.type !== 'button') {
    button.type = 'button';
  }
}

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
    closeAddEventModal();
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
  };

  const isEditing = Boolean(editingEvent);
  const successMessage = isEditing
    ? 'Evento atualizado com sucesso.'
    : 'Evento criado com sucesso.';
  const errorMessage = isEditing
    ? 'Erro ao atualizar o evento.'
    : 'Erro ao criar o evento.';

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
        editingEventOriginalDateKey = updatedEvent.date || updatedEvent.rawDate || payload.date;
      } else {
        editingEvent = { ...editingEvent, ...payload };
        editingEventOriginalDateKey = payload.date;
      }
    } else {
      const response = await window.api.createEvent(payload);
      const createdEvent = response?.evento || response?.event || response;
      if (createdEvent && typeof createdEvent === 'object') {
        editingEvent = createdEvent;
        editingEventOriginalDateKey = createdEvent.date || createdEvent.rawDate || payload.date;
      } else {
        editingEvent = { ...payload };
        editingEventOriginalDateKey = payload.date;
      }
    }

    if (typeof window.showToast === 'function') {
      window.showToast(successMessage, { type: 'success' });
    }

    if (typeof window.showInlineFeedback === 'function') {
      window.showInlineFeedback(addEventForm, successMessage, { type: 'success' });
    }

    if (editingEvent && typeof window.updateCalendarEvent === 'function') {
      try {
        window.updateCalendarEvent(editingEvent);
      } catch (updateError) {
        console.error('[modals] Falha ao sincronizar evento com o calendário.', updateError);
      }
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

function formatPhoneNumber(phone) {
  if (!phone) {
    return 'Não informado';
  }
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length === 11) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  if (digits.length === 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  if (digits.length === 0) {
    return 'Não informado';
  }
  return String(phone);
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
    closeEventDetailsModal();
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

      if (typeof window.handleContactUpdateResponse === 'function' && response?.cliente) {
        window.handleContactUpdateResponse(response.cliente, {
          contactId: currentDetailEvent.contactId,
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
      window.updateCalendarEvent(currentDetailEvent);
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
}

initializeModalInteractions();
