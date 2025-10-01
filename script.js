const sidebarButtons = document.querySelectorAll('.icon-button');
const titleElement = document.querySelector('.topbar__title');
const menus = document.querySelectorAll('.topbar__menu');
const contentPages = document.querySelectorAll('.content__page');
const monthLabel = document.querySelector('.calendar__month-label');
const prevMonthButton = document.querySelector('.calendar__nav-button--prev');
const nextMonthButton = document.querySelector('.calendar__nav-button--next');
const datesContainer = document.querySelector('.calendar__dates');

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

function createDateCell(content, isEmpty = false) {
  const cell = document.createElement('div');
  cell.className = 'calendar__date';
  if (isEmpty) {
    cell.classList.add('calendar__date--empty');
    return cell;
  }

  const span = document.createElement('span');
  span.textContent = content;
  cell.appendChild(span);
  return cell;
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
    datesContainer.appendChild(createDateCell('', true));
  }

  for (let day = 1; day <= totalDays; day += 1) {
    datesContainer.appendChild(createDateCell(day));
  }

  const totalCells = datesContainer.children.length;
  const remainder = totalCells % 7;
  if (remainder !== 0) {
    const emptyCellsToAdd = 7 - remainder;
    for (let i = 0; i < emptyCellsToAdd; i += 1) {
      datesContainer.appendChild(createDateCell('', true));
    }
  }
}

function changeMonth(offset) {
  currentCalendarDate.setMonth(currentCalendarDate.getMonth() + offset, 1);
  renderCalendar();
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

renderCalendar();
