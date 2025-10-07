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
let isSavingEvent = false;
let isDeletingEvent = false;

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

function clearDetailAutoClose() {
  if (detailAutoCloseTimeout) {
    clearTimeout(detailAutoCloseTimeout);
    detailAutoCloseTimeout = null;
  }
}

function scheduleDetailAutoClose(delay) {
  clearDetailAutoClose();
  detailAutoCloseTimeout = setTimeout(() => {
    if (!isDetailHovered) {
      closeEventDetailsModal();
    }
  }, delay);
}

function closeEventDetailsModal() {
  closeOverlay(eventDetailsOverlay);
  clearDetailAutoClose();
  if (eventDetailsToggleContactButton) {
    eventDetailsToggleContactButton.hidden = true;
    eventDetailsToggleContactButton.disabled = false;
    eventDetailsToggleContactButton.dataset.contactId = '';
    eventDetailsToggleContactButton.dataset.completed = 'false';
  }
  currentDetailEvent = null;
}

function createDetailsRow(value, isEmpty = false) {
  const container = document.createElement('div');
  container.className = 'modal__details-row';

  const valueElement = document.createElement('p');
  valueElement.className = 'modal__details-value';
  valueElement.textContent = value;

  if (isEmpty) {
    valueElement.classList.add('modal__details-value--empty');
  }

  container.appendChild(valueElement);
  return container;
}

function renderEventDetailsView() {
  if (!eventDetailsBody || !currentDetailEvent) {
    return;
  }

  const event = currentDetailEvent;
  eventDetailsBody.innerHTML = '';

  const eventDate = event.date ? formatDisplayDate(event.date) : '';
  if (eventDate) {
    eventDetailsBody.appendChild(createDetailsRow(eventDate));
  }

  if (event.type === 'contact') {
    const title = event.title || 'Contato pós-venda';
    eventDetailsBody.appendChild(createDetailsRow(title));
    const statusText = event.contactCompleted ? 'Status: Contato efetuado' : 'Status: Contato pendente';
    eventDetailsBody.appendChild(createDetailsRow(statusText));
    const purchaseDate = event.purchaseDate ? String(event.purchaseDate).slice(0, 10) : '';
    if (purchaseDate) {
      eventDetailsBody.appendChild(
        createDetailsRow(`Compra em ${formatDisplayDate(purchaseDate)}`)
      );
    }
  } else {
    eventDetailsBody.appendChild(createDetailsRow(event.title));

    if (event.description) {
      eventDetailsBody.appendChild(createDetailsRow(event.description));
    } else {
      eventDetailsBody.appendChild(createDetailsRow('Nenhuma descrição informada.', true));
    }
  }

  if (eventDetailsEditButton) {
    const isContact = event.type === 'contact';
    eventDetailsEditButton.hidden = isContact;
    eventDetailsEditButton.disabled = isContact;
  }

  if (eventDetailsDeleteButton) {
    const isContact = event.type === 'contact';
    eventDetailsDeleteButton.hidden = isContact;
    eventDetailsDeleteButton.disabled = isContact;
  }

  if (eventDetailsToggleContactButton) {
    if (event.type === 'contact' && event.contactId) {
      eventDetailsToggleContactButton.hidden = false;
      eventDetailsToggleContactButton.dataset.contactId = String(event.contactId);
      eventDetailsToggleContactButton.dataset.completed = event.contactCompleted ? 'true' : 'false';
      eventDetailsToggleContactButton.textContent = event.contactCompleted
        ? 'Marcar como pendente'
        : 'Marcar como efetuado';
    } else {
      eventDetailsToggleContactButton.hidden = true;
      eventDetailsToggleContactButton.dataset.contactId = '';
      eventDetailsToggleContactButton.dataset.completed = 'false';
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
  isDetailHovered = false;
  scheduleDetailAutoClose(5000);
}

async function handleDeleteCurrentEvent() {
  if (!currentDetailEvent || isDeletingEvent) {
    return;
  }

  const errorMessage = 'Erro ao excluir o evento.';

  try {
    isDeletingEvent = true;
    if (eventDetailsDeleteButton) {
      eventDetailsDeleteButton.disabled = true;
    }

    await window.api.deleteEvent(currentDetailEvent.id);

    if (typeof window.showToast === 'function') {
      window.showToast('Evento excluído com sucesso.', { type: 'success' });
    }

    closeEventDetailsModal();
    await refreshCalendar({ showLoading: false });
  } catch (error) {
    const message = window.api?.getErrorMessage(error, errorMessage);
    if (typeof window.showToast === 'function') {
      window.showToast(message, { type: 'error' });
    }
  } finally {
    if (eventDetailsDeleteButton) {
      eventDetailsDeleteButton.disabled = false;
    }
    isDeletingEvent = false;
  }
}

async function handleToggleContactFromModal() {
  if (!currentDetailEvent || currentDetailEvent.type !== 'contact') {
    return;
  }

  const contactId = currentDetailEvent.contactId;
  if (!contactId) {
    return;
  }

  const nextValue = !currentDetailEvent.contactCompleted;
  const successMessage = nextValue
    ? 'Contato marcado como efetuado.'
    : 'Contato marcado como pendente.';
  const errorMessage = 'Erro ao atualizar o contato.';

  try {
    if (eventDetailsToggleContactButton) {
      eventDetailsToggleContactButton.disabled = true;
    }

    const response = await window.api.updateContact(contactId, { completed: nextValue });
    if (response?.contato) {
      const updatedContact = response.contato;
      const completedValue =
        updatedContact.completed ?? updatedContact.efetuado ?? updatedContact.realizado ?? nextValue;
      currentDetailEvent.contactCompleted = Boolean(completedValue);
      if (updatedContact.title) {
        currentDetailEvent.title = updatedContact.title;
      }
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
    }

    if (typeof window.handleContactUpdateResponse === 'function' && response?.cliente) {
      window.handleContactUpdateResponse(response.cliente);
    }

    renderEventDetailsView();

    if (typeof window.showToast === 'function') {
      window.showToast(successMessage, { type: 'success' });
    }
  } catch (error) {
    const message = window.api?.getErrorMessage
      ? window.api.getErrorMessage(error, errorMessage)
      : errorMessage;
    if (typeof window.showToast === 'function') {
      window.showToast(message, { type: 'error' });
    }
  } finally {
    if (eventDetailsToggleContactButton) {
      eventDetailsToggleContactButton.disabled = false;
    }
  }
}
