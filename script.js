const sidebarButtons = document.querySelectorAll('.icon-button');
const titleElement = document.querySelector('.topbar__title');
const menus = document.querySelectorAll('.topbar__menu');
const contentPages = document.querySelectorAll('.content__page');
const monthLabel = document.querySelector('.calendar__month-label');
const prevMonthButton = document.querySelector('.calendar__nav-button--prev');
const nextMonthButton = document.querySelector('.calendar__nav-button--next');
const todayButton = document.querySelector('.calendar__nav-button--today');
const datesContainer = document.querySelector('.calendar__dates');
const addEventButton = document.querySelector('.calendar__add-button');
const addEventOverlay = document.querySelector('[data-modal="add-event"]');
const addEventForm = addEventOverlay?.querySelector('.modal__form');
const addEventCloseButton = addEventOverlay?.querySelector('[data-action="close"]');
const addEventSaveButton = addEventOverlay?.querySelector('[data-action="save"]');
const eventDetailsOverlay = document.querySelector('[data-modal="event-details"]');
const eventDetailsBody = eventDetailsOverlay?.querySelector('[data-details="body"]');
const eventDetailsCloseButton = eventDetailsOverlay?.querySelector('[data-action="close"]');
const eventDetailsEditButton = eventDetailsOverlay?.querySelector('[data-action="edit"]');
const eventDetailsDeleteButton = eventDetailsOverlay?.querySelector('[data-action="delete"]');
const eventDetailsModal = eventDetailsOverlay?.querySelector('.modal');

const events = {};
let eventIdCounter = 0;
let editingEvent = null;
let editingEventOriginalDateKey = null;
let currentDetailEvent = null;
let detailAutoCloseTimeout = null;
let isDetailHovered = false;

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

let currentCalendarDate = new Date();

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

function createDateCell(content, { isEmpty = false, isToday = false, dateKey = '' } = {}) {
  const cell = document.createElement('div');
  cell.className = 'calendar__date';
  if (isEmpty) {
    cell.classList.add('calendar__date--empty');
    return cell;
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

function renderEventsForCell(cell, dateKey) {
  const eventsContainer = cell.querySelector('.calendar__date-events');
  if (!eventsContainer) {
    return;
  }

  eventsContainer.innerHTML = '';
  const dateEvents = events[dateKey] || [];

  dateEvents.forEach((event) => {
    const chip = document.createElement('button');
    chip.className = 'calendar__event-chip';
    chip.type = 'button';
    chip.textContent = event.title;
    chip.dataset.eventId = String(event.id);
    chip.addEventListener('click', () => openEventDetailsModal(event));
    eventsContainer.appendChild(chip);
  });
}

function renderCalendar() {
  if (!monthLabel || !datesContainer) {
    return;
  }

  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const firstWeekday = firstDayOfMonth.getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  monthLabel.textContent = `${MONTH_NAMES[month]} ${year}`;

  datesContainer.innerHTML = '';

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

function changeMonth(offset) {
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() + offset, 1);
  renderCalendar();
}

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

function createDetailsRow(label, value, isEmpty = false) {
  const container = document.createElement('div');
  container.className = 'modal__details-row';

  const labelElement = document.createElement('span');
  labelElement.textContent = label;
  container.appendChild(labelElement);

  if (isEmpty) {
    const emptyMessage = document.createElement('p');
    emptyMessage.className = 'modal__empty-message';
    emptyMessage.textContent = value;
    container.appendChild(emptyMessage);
    return container;
  }

  const valueElement = document.createElement('p');
  valueElement.textContent = value;
  container.appendChild(valueElement);
  return container;
}

function openEventDetailsModal(event) {
  if (!eventDetailsOverlay || !eventDetailsBody) {
    return;
  }

  currentDetailEvent = event;
  eventDetailsBody.innerHTML = '';
  eventDetailsBody.appendChild(createDetailsRow('Data', formatDisplayDate(event.date)));
  eventDetailsBody.appendChild(createDetailsRow('Título', event.title));

  if (event.description) {
    eventDetailsBody.appendChild(createDetailsRow('Descrição', event.description));
  } else {
    eventDetailsBody.appendChild(
      createDetailsRow('Descrição', 'Nenhuma descrição informada.', true)
    );
  }

  openOverlay(eventDetailsOverlay);
  isDetailHovered = false;
  scheduleDetailAutoClose(5000);
}

function setActivePage(page) {
  sidebarButtons.forEach((button) => {
    const isActive = button.dataset.page === page;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', isActive);
  });

  menus.forEach((menu) => {
    const isActive = menu.dataset.page === page;
    menu.classList.toggle('is-active', isActive);
    menu.setAttribute('aria-hidden', !isActive);
  });

  contentPages.forEach((section) => {
    section.classList.toggle('is-active', section.dataset.page === page);
  });

  const activeButton = Array.from(sidebarButtons).find(
    (button) => button.dataset.page === page
  );
  if (activeButton) {
    titleElement.textContent = activeButton.dataset.label.toUpperCase();
  }
}

sidebarButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setActivePage(button.dataset.page);
  });
});

setActivePage('calendario');

if (prevMonthButton && nextMonthButton) {
  prevMonthButton.addEventListener('click', () => changeMonth(-1));
  nextMonthButton.addEventListener('click', () => changeMonth(1));
}

if (todayButton) {
  todayButton.addEventListener('click', () => {
    currentCalendarDate = new Date();
    currentCalendarDate.setDate(1);
    renderCalendar();
  });
}

if (addEventButton) {
  addEventButton.addEventListener('click', () => openAddEventModal());
}

if (addEventOverlay) {
  addEventOverlay.addEventListener('click', (event) => {
    if (event.target === addEventOverlay) {
      closeAddEventModal();
    }
  });
}

addEventCloseButton?.addEventListener('click', () => {
  closeAddEventModal();
});

addEventSaveButton?.addEventListener('click', () => {
  handleSaveEvent();
});

addEventForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  handleSaveEvent();
});

if (eventDetailsOverlay) {
  eventDetailsOverlay.addEventListener('click', (event) => {
    if (event.target === eventDetailsOverlay) {
      closeEventDetailsModal();
    }
  });
}

eventDetailsCloseButton?.addEventListener('click', () => {
  closeEventDetailsModal();
});

eventDetailsEditButton?.addEventListener('click', () => {
  if (!currentDetailEvent) {
    return;
  }
  const eventToEdit = currentDetailEvent;
  closeEventDetailsModal();
  openAddEventModal(eventToEdit);
});

eventDetailsDeleteButton?.addEventListener('click', () => {
  if (!currentDetailEvent) {
    return;
  }
  removeEventFromDate(currentDetailEvent.id, currentDetailEvent.date);
  closeEventDetailsModal();
  renderCalendar();
});

eventDetailsModal?.addEventListener('mouseenter', () => {
  isDetailHovered = true;
  clearDetailAutoClose();
});

eventDetailsModal?.addEventListener('mouseleave', () => {
  isDetailHovered = false;
  scheduleDetailAutoClose(3000);
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') {
    return;
  }
  if (eventDetailsOverlay?.classList.contains('is-visible')) {
    closeEventDetailsModal();
  } else if (addEventOverlay?.classList.contains('is-visible')) {
    closeAddEventModal();
  }
});

renderCalendar();
