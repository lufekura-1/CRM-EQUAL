function toggleBodyModalState() {
  const anyModalVisible = document.querySelector('.modal-overlay.is-visible');
  if (anyModalVisible) {
    document.body.classList.add('modal-open');
  } else {
    document.body.classList.remove('modal-open');
  }
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
      await window.api.updateEvent(editingEvent.id, payload);
    } else {
      await window.api.createEvent(payload);
    }

    if (typeof window.showToast === 'function') {
      window.showToast(successMessage, { type: 'success' });
    }

    closeAddEventModal();
    await refreshCalendar({ showLoading: false });
  } catch (error) {
    const message = window.api?.getErrorMessage(error, errorMessage);
    if (typeof window.showToast === 'function') {
      window.showToast(message, { type: 'error' });
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

function createDetailsRow(label, value, { isEmpty = false } = {}) {
  const container = document.createElement('div');
  container.className = 'modal__details-row';

  const labelElement = document.createElement('span');
  labelElement.className = 'modal__details-label';
  labelElement.textContent = `${label}:`;
  container.appendChild(labelElement);

  const valueElement = document.createElement('p');
  valueElement.className = 'modal__details-value';
  valueElement.textContent = value;

  if (isEmpty) {
    valueElement.classList.add('modal__details-value--empty');
  }

  container.appendChild(valueElement);
  return container;
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
    eventDetailsTitleEntity.textContent =
      event.type === 'contact' ? 'Detalhes do Contato' : 'Detalhes do Evento';
  }

  if (eventDetailsTitleStatus) {
    eventDetailsTitleStatus.textContent = status.label;
    eventDetailsTitleStatus.className = `modal__title-status modal__title-status--${status.key}`;
  }

  eventDetailsBody.innerHTML = '';

  const scheduledDate = event.date ? formatShortDate(event.date) : '';
  if (scheduledDate) {
    const dateLabel = event.type === 'contact' ? 'Data do contato' : 'Data do evento';
    eventDetailsBody.appendChild(createDetailsRow(dateLabel, scheduledDate));
  }

  if (event.type === 'contact') {
    const clientName = event.clientName || 'Cliente não informado';
    eventDetailsBody.appendChild(createDetailsRow('Nome do cliente', clientName));

    const phone = formatPhoneNumber(event.clientPhone);
    eventDetailsBody.appendChild(createDetailsRow('Telefone do cliente', phone));

    const monthsLabel = typeof formatPostSaleLabel === 'function'
      ? formatPostSaleLabel(event.contactMonths ?? event.monthsOffset)
      : '';
    const purchaseLabel = 'Data da compra';
    const purchaseDate = event.purchaseDate ? formatShortDate(event.purchaseDate) : '';
    const purchaseValue = purchaseDate
      ? `${purchaseDate}${monthsLabel ? ` - ${monthsLabel}` : ''}`
      : 'Não informada';
    eventDetailsBody.appendChild(
      createDetailsRow(purchaseLabel, purchaseValue, { isEmpty: !purchaseDate })
    );

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
    eventDetailsBody.appendChild(
      createDetailsRow('Compra do cliente', purchaseText, {
        isEmpty: !purchaseParts.length,
      })
    );
  } else {
    const title = event.title || 'Evento';
    eventDetailsBody.appendChild(createDetailsRow('Título do evento', title));

    if (event.clientName) {
      eventDetailsBody.appendChild(
        createDetailsRow('Cliente relacionado', event.clientName)
      );
    }
  }

  const observationSource =
    event.notes ?? event.observacao ?? event.observation ?? event.description ?? '';
  const hasObservation = Boolean(observationSource);
  const observationText = hasObservation
    ? String(observationSource)
    : 'Sem observações registradas.';
  eventDetailsBody.appendChild(
    createDetailsRow('Observação', observationText, { isEmpty: !hasObservation })
  );

  if (eventDetailsToggleStatusButton) {
    const isContact = event.type === 'contact';
    const hasIdentifier = isContact ? Boolean(event.contactId) : Boolean(event.id);
    if (!hasIdentifier) {
      eventDetailsToggleStatusButton.hidden = true;
      eventDetailsToggleStatusButton.dataset.contactId = '';
      eventDetailsToggleStatusButton.dataset.eventId = '';
      eventDetailsToggleStatusButton.dataset.entityType = '';
      eventDetailsToggleStatusButton.dataset.statusKey = status.key;
    } else {
      eventDetailsToggleStatusButton.hidden = false;
      eventDetailsToggleStatusButton.disabled = false;
      eventDetailsToggleStatusButton.textContent =
        status.key === 'completed' ? 'Marcar como Pendente' : 'Marcar como Efetuado';
      eventDetailsToggleStatusButton.dataset.entityType = isContact ? 'contact' : 'event';
      eventDetailsToggleStatusButton.dataset.contactId = isContact ? String(event.contactId) : '';
      eventDetailsToggleStatusButton.dataset.eventId = String(event.id ?? '');
      eventDetailsToggleStatusButton.dataset.statusKey = status.key;
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
        window.handleContactUpdateResponse(response.cliente);
      }
    } else {
      await window.api.updateEvent(currentDetailEvent.id, { completed: nextValue });
      currentDetailEvent.completed = nextValue;
    }

    renderEventDetailsView();

    if (typeof window.showToast === 'function') {
      window.showToast(successMessage, { type: 'success' });
    }

    if (!isContact && typeof window.refreshCalendar === 'function') {
      window.refreshCalendar({ showLoading: false });
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
  addEventOverlay?.addEventListener('click', handleAddEventOverlayClick);
  addEventCloseButton?.addEventListener('click', () => {
    closeAddEventModal();
  });
  addEventSaveButton?.addEventListener('click', (event) => {
    event.preventDefault();
    handleSaveEvent();
  });
  addEventForm?.addEventListener('submit', handleAddEventFormSubmit);

  eventDetailsOverlay?.addEventListener('click', handleEventDetailsOverlayClick);
  eventDetailsCloseButton?.addEventListener('click', () => {
    closeEventDetailsModal();
  });
  eventDetailsToggleStatusButton?.addEventListener('click', handleEventDetailsToggleClick);
}

initializeModalInteractions();
