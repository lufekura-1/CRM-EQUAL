function getCurrentUser() {
  return (
    USERS.find((user) => user.id === currentUserId) ||
    USERS[0] || {
      id: '',
      code: '?',
      name: 'Usuário desconhecido',
      subtitle: '',
    }
  );
}

function setCurrentUser(userId) {
  const selectedUser = USERS.find((user) => user.id === userId);
  if (!selectedUser) {
    return;
  }
  currentUserId = selectedUser.id;
  updateUserSelectorButton();
}

function updateUserSelectorButton() {
  if (!userSelectorButton) {
    return;
  }

  const currentUser = getCurrentUser();
  userSelectorButton.textContent = currentUser.code;
  userSelectorButton.setAttribute(
    'aria-label',
    `Usuário atual: ${currentUser.name}`
  );
  userSelectorButton.dataset.tooltip = `Usuário: ${currentUser.name}`;
}

function createUserOption(user) {
  const option = document.createElement('label');
  option.className = 'user-selector__option';

  const input = document.createElement('input');
  input.type = 'radio';
  input.name = 'selectedUser';
  input.value = user.id;
  input.required = true;
  input.checked = user.id === currentUserId;

  const codeElement = document.createElement('span');
  codeElement.className = 'user-selector__code';
  codeElement.textContent = user.code;

  const details = document.createElement('span');
  details.className = 'user-selector__details';

  const nameElement = document.createElement('span');
  nameElement.className = 'user-selector__name';
  nameElement.textContent = user.name;

  const subtitleElement = document.createElement('span');
  subtitleElement.className = 'user-selector__subtitle';
  subtitleElement.textContent = user.subtitle;

  details.appendChild(nameElement);
  details.appendChild(subtitleElement);

  option.appendChild(input);
  option.appendChild(codeElement);
  option.appendChild(details);

  return option;
}

function renderUserSelectorOptions() {
  if (!userSelectorFieldset) {
    return;
  }

  userSelectorFieldset.innerHTML = '';
  USERS.forEach((user) => {
    const option = createUserOption(user);
    userSelectorFieldset.appendChild(option);
  });
}

function closeUserSelectorModal() {
  if (!userSelectorOverlay) {
    return;
  }
  closeOverlay(userSelectorOverlay);
}

function handleUserSelectorSubmit(event) {
  if (!userSelectorForm) {
    return;
  }

  event.preventDefault();
  const formData = new FormData(userSelectorForm);
  const selectedUserId = formData.get('selectedUser');
  if (!selectedUserId) {
    return;
  }

  const selectedUser = USERS.find((user) => user.id === selectedUserId);
  if (!selectedUser) {
    return;
  }

  const shouldChange = window.confirm(
    `Confirmar troca de usuário para ${selectedUser.name}?`
  );

  if (!shouldChange) {
    return;
  }

  setCurrentUser(selectedUserId);
  closeUserSelectorModal();
}

function initializeUserSelector() {
  if (!userSelectorButton || !userSelectorOverlay || !userSelectorForm) {
    return;
  }

  updateUserSelectorButton();
  renderUserSelectorOptions();

  userSelectorButton.addEventListener('click', () => {
    renderUserSelectorOptions();
    openOverlay(userSelectorOverlay);
  });

  userSelectorOverlay.addEventListener('click', (event) => {
    if (event.target === userSelectorOverlay) {
      closeUserSelectorModal();
    }
  });

  userSelectorCancelButtons?.forEach((button) => {
    button.addEventListener('click', () => {
      closeUserSelectorModal();
    });
  });

  userSelectorConfirmButton?.addEventListener('click', () => {
    if (typeof userSelectorForm.requestSubmit === 'function') {
      userSelectorForm.requestSubmit();
    } else {
      userSelectorForm.dispatchEvent(
        new Event('submit', { cancelable: true, bubbles: true })
      );
    }
  });

  userSelectorForm.addEventListener('submit', handleUserSelectorSubmit);
}
