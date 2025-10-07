const ACTIVE_PAGE_STORAGE_KEY = 'crm-active-page';

function storeActivePage(page) {
  try {
    if (page) {
      window.localStorage.setItem(ACTIVE_PAGE_STORAGE_KEY, page);
    } else {
      window.localStorage.removeItem(ACTIVE_PAGE_STORAGE_KEY);
    }
  } catch (error) {
    console.warn('Não foi possível salvar a página ativa.', error);
  }
}

function getStoredActivePage() {
  try {
    return window.localStorage.getItem(ACTIVE_PAGE_STORAGE_KEY);
  } catch (error) {
    console.warn('Não foi possível recuperar a página ativa salva.', error);
    return null;
  }
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
  } else {
    const activeMenu = Array.from(menus).find((menu) => menu.dataset.page === page);
    if (activeMenu?.dataset.label) {
      titleElement.textContent = activeMenu.dataset.label.toUpperCase();
    } else {
      const activeSection = Array.from(contentPages).find((section) => section.dataset.page === page);
      if (activeSection?.dataset.label) {
        titleElement.textContent = activeSection.dataset.label.toUpperCase();
      } else {
        titleElement.textContent = page.toUpperCase();
      }
    }
  }

  document.dispatchEvent(
    new CustomEvent('pagechange', {
      detail: { page },
    }),
  );

  storeActivePage(page);
}

window.getStoredActivePage = getStoredActivePage;
