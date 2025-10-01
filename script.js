const sidebarButtons = document.querySelectorAll('.icon-button');
const titleElement = document.querySelector('.topbar__title');
const menus = document.querySelectorAll('.topbar__menu');
const contentPages = document.querySelectorAll('.content__page');

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
