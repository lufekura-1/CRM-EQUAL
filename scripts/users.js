const configPageContainer = document.querySelector('[data-role="config-page"]');

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
  if (selectedUser.id === currentUserId) {
    return;
  }
  const previousUserId = currentUserId;
  currentUserId = selectedUser.id;
  updateUserSelectorButton();
  dispatchUserChange(previousUserId, selectedUser);
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

function getSortedUsers() {
  return [...USERS].sort((a, b) => {
    const nameA = a?.name || '';
    const nameB = b?.name || '';
    return nameA.localeCompare(nameB, 'pt-BR', { sensitivity: 'base' });
  });
}

function formatUserSubtitle(user) {
  if (!user) {
    return '';
  }

  const subtitleText = user.subtitle ? String(user.subtitle).trim() : '';
  if (subtitleText) {
    return subtitleText;
  }

  const parts = [];
  if (user.accessLevel !== undefined && user.accessLevel !== null && user.accessLevel !== '') {
    parts.push(`Nível ${user.accessLevel}`);
  }
  if (user.role) {
    parts.push(String(user.role).trim());
  }
  return parts.join(' · ');
}

function createManagementButton(action, label, userId = null) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `config-card__action config-card__action--${action}`;
  button.dataset.configAction = action;
  if (userId) {
    button.dataset.userId = userId;
  }
  button.textContent = label;
  return button;
}

function showManagementFeedback(action, user = null) {
  const hasToast = typeof window.showToast === 'function';
  const name = user?.name || 'usuário';
  let message = 'Funcionalidade em desenvolvimento.';

  if (action === 'add') {
    message = 'Cadastro de novos usuários em desenvolvimento.';
  } else if (action === 'edit') {
    message = `Edição do usuário ${name} em desenvolvimento.`;
  } else if (action === 'delete') {
    message = `Remoção do usuário ${name} em desenvolvimento.`;
  }

  if (hasToast) {
    window.showToast(message, { type: 'info' });
  } else {
    console.info('[users]', message);
  }
}

function handleUserManagementClick(event) {
  const target = event.target instanceof Element ? event.target.closest('[data-config-action]') : null;
  if (!target) {
    return;
  }

  const action = target.dataset.configAction;
  if (!action) {
    return;
  }

  if (action === 'add') {
    showManagementFeedback('add');
    return;
  }

  const userId = target.dataset.userId || '';
  const user = USERS.find((candidate) => candidate.id === userId) || null;

  if (action === 'edit') {
    showManagementFeedback('edit', user);
    return;
  }

  if (action === 'delete') {
    showManagementFeedback('delete', user);
    return;
  }

  showManagementFeedback(action, user);
}

function createUserManagementCard() {
  const card = document.createElement('section');
  card.className = 'config-card config-card--users';

  const header = document.createElement('div');
  header.className = 'config-card__header';

  const title = document.createElement('h2');
  title.className = 'config-card__title';
  title.textContent = 'Gerenciamento de usuários';
  header.appendChild(title);

  const addButton = createManagementButton('add', 'Adicionar usuário');
  header.appendChild(addButton);

  const tableWrapper = document.createElement('div');
  tableWrapper.className = 'config-card__table-wrapper';

  const table = document.createElement('table');
  table.className = 'config-card__table';
  table.setAttribute('aria-label', 'Usuários cadastrados');

  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr>
      <th scope="col">Usuário</th>
      <th scope="col">Nível</th>
      <th scope="col">Função</th>
      <th scope="col" class="config-card__actions-column">Ações</th>
    </tr>
  `;
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  getSortedUsers().forEach((user) => {
    const row = document.createElement('tr');

    const nameCell = document.createElement('td');
    nameCell.textContent = user.name;
    row.appendChild(nameCell);

    const levelCell = document.createElement('td');
    levelCell.textContent =
      user.accessLevel !== undefined && user.accessLevel !== null && user.accessLevel !== ''
        ? `Nível ${user.accessLevel}`
        : '-';
    row.appendChild(levelCell);

    const roleCell = document.createElement('td');
    roleCell.textContent = user.role || '-';
    row.appendChild(roleCell);

    const actionsCell = document.createElement('td');
    actionsCell.className = 'config-card__cell-actions';
    actionsCell.appendChild(createManagementButton('edit', 'Editar', user.id));
    actionsCell.appendChild(createManagementButton('delete', 'Excluir', user.id));
    row.appendChild(actionsCell);

    tbody.appendChild(row);
  });
  table.appendChild(tbody);

  tableWrapper.appendChild(table);

  card.appendChild(header);
  card.appendChild(tableWrapper);

  card.addEventListener('click', handleUserManagementClick);

  return card;
}

function renderConfigPageForUser(targetUser = null) {
  if (!configPageContainer) {
    return;
  }

  configPageContainer.innerHTML = '';
  const user = targetUser || getCurrentUser();
  if (!user || Number(user.accessLevel || 0) < 3) {
    return;
  }

  const card = createUserManagementCard();
  configPageContainer.appendChild(card);
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

  const chip = document.createElement('span');
  chip.className = 'user-selector__chip';

  const details = document.createElement('span');
  details.className = 'user-selector__details';

  const nameElement = document.createElement('span');
  nameElement.className = 'user-selector__name';
  nameElement.textContent = user.name;

  const subtitleElement = document.createElement('span');
  subtitleElement.className = 'user-selector__subtitle';
  subtitleElement.textContent = formatUserSubtitle(user);

  details.appendChild(nameElement);
  details.appendChild(subtitleElement);

  chip.appendChild(codeElement);
  chip.appendChild(details);

  option.appendChild(input);
  option.appendChild(chip);

  return option;
}

function dispatchUserChange(previousUserId, nextUser) {
  const detail = {
    previousUserId: previousUserId || null,
    previousUser: USERS.find((user) => user.id === previousUserId) || null,
    userId: nextUser?.id || null,
    user: nextUser || null,
  };

  document.dispatchEvent(new CustomEvent('userchange', { detail }));
}

function renderUserSelectorOptions() {
  if (!userSelectorFieldset) {
    return;
  }

  userSelectorFieldset.innerHTML = '';
  const sortedUsers = getSortedUsers();
  sortedUsers.forEach((user) => {
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
  if (event && typeof event.stopPropagation === 'function') {
    event.stopPropagation();
  }
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
  if (typeof window.showToast === 'function') {
    window.showToast(`Usuário alterado para ${selectedUser.name}.`, { type: 'success' });
  }
  closeUserSelectorModal();
}

function initializeUserSelector() {
  if (!userSelectorButton || !userSelectorOverlay || !userSelectorForm) {
    return;
  }

  updateUserSelectorButton();
  renderUserSelectorOptions();
  renderConfigPageForUser(getCurrentUser());

  userSelectorButton.addEventListener('click', () => {
    renderUserSelectorOptions();
    openOverlay(userSelectorOverlay);
  });

  userSelectorOverlay.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }
    if (!event.target.closest('.modal')) {
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

renderConfigPageForUser(getCurrentUser());

document.addEventListener('userchange', (event) => {
  renderConfigPageForUser(event.detail?.user || getCurrentUser());
});

window.getCurrentUser = getCurrentUser;
window.setCurrentUser = setCurrentUser;
window.closeUserSelectorModal = closeUserSelectorModal;
