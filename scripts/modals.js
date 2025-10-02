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

function removeEventFromDate(eventId, dateKey) {
  const dateEvents = events[dateKey];
  if (!dateEvents) {
    return;
  }
  const index = dateEvents.findIndex((item) => item.id === eventId);
  if (index !== -1) {
    dateEvents.splice(index, 1);
    if (dateEvents.length === 0) {
      delete events[dateKey];
    }
  }
}

function handleSaveEvent() {
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

  if (editingEvent) {
    if (editingEventOriginalDateKey && editingEventOriginalDateKey !== dateValue) {
      removeEventFromDate(editingEvent.id, editingEventOriginalDateKey);
      editingEvent.date = dateValue;
      ensureEventsArray(dateValue).push(editingEvent);
    } else {
      editingEvent.date = dateValue;
    }

    editingEvent.title = titleValue;
    editingEvent.description = descriptionValue;
  } else {
    eventIdCounter += 1;
    const newEvent = {
      id: eventIdCounter,
      date: dateValue,
      title: titleValue,
      description: descriptionValue,
    };
    ensureEventsArray(dateValue).push(newEvent);
  }

  closeAddEventModal();
  renderCalendar();
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

function openEventDetailsModal(event) {
  if (!eventDetailsOverlay || !eventDetailsBody) {
    return;
  }

  currentDetailEvent = event;
  eventDetailsBody.innerHTML = '';
  eventDetailsBody.appendChild(createDetailsRow(formatDisplayDate(event.date)));
  eventDetailsBody.appendChild(createDetailsRow(event.title));

  if (event.description) {
    eventDetailsBody.appendChild(createDetailsRow(event.description));
  } else {
    eventDetailsBody.appendChild(
      createDetailsRow('Nenhuma descrição informada.', true)
    );
  }

  openOverlay(eventDetailsOverlay);
  isDetailHovered = false;
  scheduleDetailAutoClose(5000);
}
