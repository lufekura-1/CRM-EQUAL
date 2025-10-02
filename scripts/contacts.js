'use strict';

(function initializeContactsPage() {
  const contactsPage = document.querySelector('.content__page[data-page="contatos"]');
  if (!contactsPage) {
    return;
  }

  const tabButtons = document.querySelectorAll('[data-contact-tab]');
  const tabPanels = contactsPage.querySelectorAll('[data-contact-tab-content]');
  const rangeButtons = contactsPage.querySelectorAll('.contacts-range-button');
  const kanbanBoard = contactsPage.querySelector('[data-role="kanban-board"]');
  const kanbanColumns = {
    abertos: kanbanBoard?.querySelector('[data-column="abertos"]') ?? null,
    atrasados: kanbanBoard?.querySelector('[data-column="atrasados"]') ?? null,
    concluidos: kanbanBoard?.querySelector('[data-column="concluidos"]') ?? null,
  };
  const kanbanCounters = {
    abertos: kanbanBoard?.querySelector('[data-column-count="abertos"]') ?? null,
    atrasados: kanbanBoard?.querySelector('[data-column-count="atrasados"]') ?? null,
    concluidos: kanbanBoard?.querySelector('[data-column-count="concluidos"]') ?? null,
  };
  const postSaleList = contactsPage.querySelector('[data-role="post-sale-list"]');
  const offersList = contactsPage.querySelector('[data-role="offers-list"]');
  const historyTableBody = contactsPage.querySelector('[data-role="contacts-history-body"]');

  const STATUS_BADGE_CLASS = {
    abertos: 'contacts-badge contacts-badge--due',
    atrasados: 'contacts-badge contacts-badge--late',
    concluidos: 'contacts-badge contacts-badge--done',
  };

  const KANBAN_ITEMS = [
    {
      id: 'kb-001',
      clientId: 'cli-005',
      title: 'Agendar retorno para ajuste de armação',
      description: 'Cliente retirou o óculos há 5 dias, verificar conforto na armação.',
      status: 'abertos',
      dueDate: '2024-07-02',
      cadence: 'weekly',
    },
    {
      id: 'kb-002',
      clientId: 'cli-018',
      title: 'Confirmar entrega da lente multifocal',
      description: 'Validar se o cliente recebeu e se adaptou bem à lente multifocal.',
      status: 'abertos',
      dueDate: '2024-07-03',
      cadence: 'weekly',
    },
    {
      id: 'kb-003',
      clientId: 'cli-026',
      title: 'Contato pós-venda 30 dias',
      description: 'Reforçar orientações de limpeza e manutenção da armação.',
      status: 'concluidos',
      dueDate: '2024-06-25',
      cadence: 'monthly',
    },
    {
      id: 'kb-004',
      clientId: 'cli-012',
      title: 'Resolver troca de estojo',
      description: 'Cliente solicitou troca do estojo por defeito na costura.',
      status: 'atrasados',
      dueDate: '2024-06-28',
      cadence: 'weekly',
    },
    {
      id: 'kb-005',
      clientId: 'cli-033',
      title: 'Apresentar nova linha solar',
      description: 'Enviar catálogo digital das armações solares premium.',
      status: 'abertos',
      dueDate: '2024-07-10',
      cadence: 'monthly',
    },
    {
      id: 'kb-006',
      clientId: 'cli-041',
      title: 'Registrar satisfação da manutenção',
      description: 'Cliente realizou manutenção preventiva, coletar feedback.',
      status: 'concluidos',
      dueDate: '2024-06-20',
      cadence: 'all',
    },
  ];

  const POST_SALE_ITEMS = [
    {
      id: 'ps-001',
      clientId: 'cli-017',
      title: 'Ajuste de plaquetas',
      notes: 'Verificar se o ajuste das plaquetas ficou confortável após a entrega.',
      dueDate: '2024-07-04',
    },
    {
      id: 'ps-002',
      clientId: 'cli-022',
      title: 'Lembrar revisão de 6 meses',
      notes: 'Enviar mensagem sugerindo revisão de limpeza ultrassônica.',
      dueDate: '2024-07-08',
    },
    {
      id: 'ps-003',
      clientId: 'cli-009',
      title: 'Follow-up lentes digitais',
      notes: 'Confirmar adaptação às lentes com filtro azul e coletar opinião.',
      dueDate: '2024-07-06',
    },
  ];

  const OFFER_ITEMS = [
    {
      id: 'of-001',
      clientId: 'cli-003',
      product: 'Coleção Solar 2024',
      value: 890,
      expiresAt: '2024-07-15',
    },
    {
      id: 'of-002',
      clientId: 'cli-028',
      product: 'Relógio Equal Chronos',
      value: 1250,
      expiresAt: '2024-07-22',
    },
    {
      id: 'of-003',
      clientId: 'cli-045',
      product: 'Upgrade de lente multifocal premium',
      value: 640,
      expiresAt: '2024-07-30',
    },
    {
      id: 'of-004',
      clientId: 'cli-014',
      product: 'Coleção Jóias Modernas',
      value: 980,
      expiresAt: '2024-07-18',
    },
  ];

  const CONTACT_HISTORY = [
    {
      id: 'hist-001',
      clientId: 'cli-005',
      invoice: 'NF-CLI-005-123',
      purchaseDate: '2024-05-30',
      contactDate: '2024-06-05',
      completed: true,
    },
    {
      id: 'hist-002',
      clientId: 'cli-018',
      invoice: 'NF-CLI-018-111',
      purchaseDate: '2024-06-01',
      contactDate: '2024-06-15',
      completed: false,
    },
    {
      id: 'hist-003',
      clientId: 'cli-026',
      invoice: 'NF-CLI-026-137',
      purchaseDate: '2024-05-06',
      contactDate: '2024-06-06',
      completed: true,
    },
    {
      id: 'hist-004',
      clientId: 'cli-033',
      invoice: 'NF-CLI-033-142',
      purchaseDate: '2024-04-21',
      contactDate: '2024-05-02',
      completed: true,
    },
    {
      id: 'hist-005',
      clientId: 'cli-041',
      invoice: 'NF-CLI-041-128',
      purchaseDate: '2024-05-08',
      contactDate: '2024-06-01',
      completed: false,
    },
  ];

  const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const currencyFormatter = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });

  let currentRange = 'weekly';

  rangeButtons.forEach((button) => {
    const isActive = button.dataset.range === currentRange;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });

  function findClient(clientId) {
    if (!clientId || typeof CLIENTS === 'undefined' || !Array.isArray(CLIENTS)) {
      return null;
    }
    return CLIENTS.find((client) => client.id === clientId) ?? null;
  }

  function getClientName(clientId) {
    const client = findClient(clientId);
    return client?.name ?? 'Cliente';
  }

  function formatDate(dateString) {
    const parsed = dateString ? new Date(`${dateString}T00:00:00`) : null;
    if (!parsed || Number.isNaN(parsed.getTime())) {
      return '-';
    }
    return dateFormatter.format(parsed);
  }

  function formatCurrency(value) {
    return currencyFormatter.format(Number(value) || 0);
  }

  function createClientLink(label, clientId, className = '') {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = className;
    element.textContent = label;
    element.dataset.clientLink = 'true';
    element.dataset.clientId = clientId;
    return element;
  }

  function createKanbanCard(item) {
    const card = document.createElement('article');
    card.className = 'contacts-card';

    const title = document.createElement('h3');
    title.className = 'contacts-card__title';
    title.textContent = item.title;

    const clientButton = createClientLink(getClientName(item.clientId), item.clientId, 'contacts-card__client');

    const description = document.createElement('p');
    description.className = 'contacts-card__description';
    description.textContent = item.description;

    const meta = document.createElement('div');
    meta.className = 'contacts-card__meta';

    const badge = document.createElement('span');
    badge.className = STATUS_BADGE_CLASS[item.status] ?? 'contacts-badge';
    badge.textContent = item.status === 'concluidos' ? 'Concluído' : item.status === 'atrasados' ? 'Atrasado' : 'Em aberto';

    const due = document.createElement('time');
    due.dateTime = item.dueDate;
    due.textContent = `Prazo: ${formatDate(item.dueDate)}`;

    meta.append(badge, due);
    card.append(title, clientButton, description, meta);
    return card;
  }

  function renderKanban() {
    Object.values(kanbanColumns).forEach((column) => {
      if (column) {
        column.innerHTML = '';
      }
    });

    Object.entries(kanbanCounters).forEach(([, counter]) => {
      if (counter) {
        counter.textContent = '0';
      }
    });

    if (!kanbanBoard) {
      return;
    }

    const filteredItems = KANBAN_ITEMS.filter((item) => {
      if (currentRange === 'monthly') {
        return item.cadence === 'monthly' || item.cadence === 'all';
      }
      if (currentRange === 'weekly') {
        return item.cadence === 'weekly' || item.cadence === 'all';
      }
      return true;
    });

    const counts = { abertos: 0, atrasados: 0, concluidos: 0 };

    filteredItems.forEach((item) => {
      const column = kanbanColumns[item.status];
      if (!column) {
        return;
      }
      counts[item.status] += 1;
      column.appendChild(createKanbanCard(item));
    });

    Object.entries(kanbanColumns).forEach(([status, column]) => {
      if (!column) {
        return;
      }
      if (!column.children.length) {
        const empty = document.createElement('p');
        empty.className = 'contacts-kanban__empty';
        empty.textContent = 'Nenhum contato registrado.';
        column.appendChild(empty);
      }
    });

    Object.entries(counts).forEach(([status, count]) => {
      const counter = kanbanCounters[status];
      if (counter) {
        counter.textContent = String(count);
      }
    });
  }

  function renderPostSale() {
    if (!postSaleList) {
      return;
    }
    postSaleList.innerHTML = '';
    POST_SALE_ITEMS.forEach((item) => {
      const listItem = document.createElement('li');
      listItem.className = 'contacts-stack__item';

      const header = document.createElement('div');
      header.className = 'contacts-stack__header';
      const title = document.createElement('h3');
      title.className = 'contacts-stack__title';
      title.textContent = item.title;
      const badge = document.createElement('span');
      badge.className = 'contacts-badge contacts-badge--due';
      badge.textContent = formatDate(item.dueDate);
      header.append(title, badge);

      const clientButton = createClientLink(getClientName(item.clientId), item.clientId, 'contacts-card__client');

      const body = document.createElement('p');
      body.className = 'contacts-stack__body';
      body.textContent = item.notes;

      listItem.append(header, clientButton, body);
      postSaleList.appendChild(listItem);
    });
  }

  function renderOffers() {
    if (!offersList) {
      return;
    }
    offersList.innerHTML = '';
    OFFER_ITEMS.forEach((item) => {
      const card = document.createElement('article');
      card.className = 'contacts-offer';

      const title = document.createElement('h3');
      title.className = 'contacts-offer__title';
      title.textContent = item.product;

      const meta = document.createElement('div');
      meta.className = 'contacts-offer__meta';

      const clientWrapper = document.createElement('div');
      clientWrapper.textContent = 'Cliente: ';
      const clientLink = createClientLink(getClientName(item.clientId), item.clientId, 'contacts-card__client');
      clientWrapper.appendChild(clientLink);

      const value = document.createElement('div');
      value.textContent = `Oferta: ${formatCurrency(item.value)}`;

      const expires = document.createElement('div');
      expires.textContent = `Válido até: ${formatDate(item.expiresAt)}`;

      meta.append(clientWrapper, value, expires);
      card.append(title, meta);
      offersList.appendChild(card);
    });
  }

  function renderHistory() {
    if (!historyTableBody) {
      return;
    }
    historyTableBody.innerHTML = '';

    CONTACT_HISTORY.forEach((item) => {
      const row = document.createElement('tr');

      const clientCell = document.createElement('td');
      const link = document.createElement('a');
      link.href = '#';
      link.className = 'contacts-history__link';
      link.dataset.clientLink = 'true';
      link.dataset.clientId = item.clientId;
      link.textContent = getClientName(item.clientId);
      clientCell.appendChild(link);

      const invoiceCell = document.createElement('td');
      invoiceCell.textContent = item.invoice;

      const purchaseCell = document.createElement('td');
      purchaseCell.textContent = formatDate(item.purchaseDate);

      const contactCell = document.createElement('td');
      contactCell.textContent = formatDate(item.contactDate);

      const statusCell = document.createElement('td');
      const status = document.createElement('span');
      status.className = item.completed
        ? 'contacts-status-chip contacts-status-chip--yes'
        : 'contacts-status-chip contacts-status-chip--no';
      status.textContent = item.completed ? 'Sim' : 'Não';
      statusCell.appendChild(status);

      row.append(clientCell, invoiceCell, purchaseCell, contactCell, statusCell);
      historyTableBody.appendChild(row);
    });
  }

  function activateTab(tabName) {
    tabButtons.forEach((button) => {
      const isActive = button.dataset.contactTab === tabName;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-selected', String(isActive));
    });

    tabPanels.forEach((panel) => {
      const isActive = panel.dataset.contactTabContent === tabName;
      panel.classList.toggle('is-active', isActive);
      panel.setAttribute('aria-hidden', String(!isActive));
    });
  }

  function setRange(range) {
    if (currentRange === range) {
      return;
    }
    currentRange = range;
    rangeButtons.forEach((button) => {
      const isActive = button.dataset.range === range;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
    renderKanban();
  }

  tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const tab = button.dataset.contactTab;
      if (tab) {
        activateTab(tab);
      }
    });
  });

  rangeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const range = button.dataset.range;
      if (range) {
        setRange(range);
      }
    });
  });

  contactsPage.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const link = target.closest('[data-client-link]');
    if (!link) {
      return;
    }
    event.preventDefault();
    const clientId = link.getAttribute('data-client-id');
    if (!clientId || typeof window.navigateToClientDetail !== 'function') {
      return;
    }
    window.navigateToClientDetail(clientId);
  });

  activateTab('abertos');
  renderKanban();
  renderPostSale();
  renderOffers();
  renderHistory();
})();
