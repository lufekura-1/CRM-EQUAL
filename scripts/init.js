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
