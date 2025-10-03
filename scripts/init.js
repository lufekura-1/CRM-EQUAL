sidebarButtons.forEach((button) => {
  button.addEventListener('click', () => {
    setActivePage(button.dataset.page);
  });
});

homeShortcuts.forEach((shortcut) => {
  shortcut.addEventListener('click', () => {
    const targetPage = shortcut.dataset.pageTarget;
    if (!targetPage) {
      return;
    }
    setActivePage(targetPage);
  });
});

initializeUserSelector();

setActivePage('home');

if (prevMonthButton && nextMonthButton) {
  prevMonthButton.addEventListener('click', () => changeCalendarPeriod(-1));
  nextMonthButton.addEventListener('click', () => changeCalendarPeriod(1));
}

if (todayButton) {
  todayButton.addEventListener('click', () => {
    const today = new Date();
    if (currentCalendarView === 'week') {
      currentCalendarDate = getStartOfWeek(today);
    } else {
      currentCalendarDate = new Date(today.getFullYear(), today.getMonth(), 1);
    }
    refreshCalendar();
  });
}

calendarViewButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const { calendarView } = button.dataset;
    if (!calendarView) {
      return;
    }
    setCalendarView(calendarView);
  });
});

if (addEventButton) {
  addEventButton.addEventListener('click', () => openAddEventModal());
}

homeAddEventCardButton?.addEventListener('click', () => {
  openAddEventModal();
});

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
  handleDeleteCurrentEvent();
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
  } else if (clientsAdvancedOverlay?.classList.contains('is-visible')) {
    closeClientsAdvancedSearchModal();
  } else if (clientInterestsOverlay?.classList.contains('is-visible')) {
    closeClientInterestsModal();
  } else if (userSelectorOverlay?.classList.contains('is-visible')) {
    closeUserSelectorModal();
  }
});

refreshCalendar();
