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
