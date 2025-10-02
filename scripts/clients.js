'use strict';

const CLIENTS_PER_PAGE = 25;

const CLIENTS = [
  { id: 'cli-001', name: 'Ana Souza', cpf: '052.761.984-10', phone: '(11) 91234-5678', gender: 'F', age: 29, lastPurchase: '2024-06-18', acceptsContact: true },
  { id: 'cli-002', name: 'Bruno Lima', cpf: '834.295.617-42', phone: '(21) 99876-5432', gender: 'M', age: 37, lastPurchase: '2024-04-12', acceptsContact: false },
  { id: 'cli-003', name: 'Camila Ferreira', cpf: '317.640.258-81', phone: '(31) 91345-7766', gender: 'F', age: 41, lastPurchase: '2024-02-25', acceptsContact: true },
  { id: 'cli-004', name: 'Diego Andrade', cpf: '468.120.975-63', phone: '(41) 99652-8842', gender: 'M', age: 33, lastPurchase: '2023-12-10', acceptsContact: true },
  { id: 'cli-005', name: 'Elisa Martins', cpf: '129.583.407-25', phone: '(85) 99123-4415', gender: 'F', age: 26, lastPurchase: '2024-05-30', acceptsContact: true },
  { id: 'cli-006', name: 'Felipe Santos', cpf: '594.213.876-04', phone: '(51) 99980-4521', gender: 'M', age: 48, lastPurchase: '2024-01-05', acceptsContact: false },
  { id: 'cli-007', name: 'Gabriela Costa', cpf: '708.642.159-37', phone: '(19) 99741-8890', gender: 'F', age: 31, lastPurchase: '2024-03-15', acceptsContact: true },
  { id: 'cli-008', name: 'Henrique Barbosa', cpf: '283.975.604-18', phone: '(27) 99119-3302', gender: 'M', age: 52, lastPurchase: '2023-11-22', acceptsContact: true },
  { id: 'cli-009', name: 'Isabela Rocha', cpf: '635.821.479-06', phone: '(62) 98214-5550', gender: 'F', age: 24, lastPurchase: '2024-06-03', acceptsContact: false },
  { id: 'cli-010', name: 'João Almeida', cpf: '901.264.738-55', phone: '(13) 98845-6677', gender: 'M', age: 28, lastPurchase: '2024-05-18', acceptsContact: true },
  { id: 'cli-011', name: 'Karen Ribeiro', cpf: '472.930.681-27', phone: '(71) 99650-7432', gender: 'F', age: 39, lastPurchase: '2023-10-09', acceptsContact: false },
  { id: 'cli-012', name: 'Leandro Gomes', cpf: '236.894.517-90', phone: '(48) 99777-2143', gender: 'M', age: 45, lastPurchase: '2024-02-04', acceptsContact: true },
  { id: 'cli-013', name: 'Mariana Azevedo', cpf: '350.781.429-60', phone: '(41) 98431-2586', gender: 'F', age: 35, lastPurchase: '2024-01-27', acceptsContact: true },
  { id: 'cli-014', name: 'Nicolas Pinto', cpf: '514.209.863-45', phone: '(31) 99520-7854', gender: 'M', age: 30, lastPurchase: '2024-04-28', acceptsContact: false },
  { id: 'cli-015', name: 'Olivia Figueiredo', cpf: '671.058.492-11', phone: '(21) 98861-9440', gender: 'F', age: 43, lastPurchase: '2024-03-07', acceptsContact: true },
  { id: 'cli-016', name: 'Paulo Teixeira', cpf: '743.196.820-03', phone: '(11) 98102-3344', gender: 'M', age: 55, lastPurchase: '2023-09-16', acceptsContact: false },
  { id: 'cli-017', name: 'Queila Nunes', cpf: '812.367.945-22', phone: '(31) 98873-9001', gender: 'F', age: 29, lastPurchase: '2024-05-11', acceptsContact: true },
  { id: 'cli-018', name: 'Rafael Cardoso', cpf: '924.570.138-09', phone: '(19) 99788-6023', gender: 'M', age: 32, lastPurchase: '2024-06-01', acceptsContact: true },
  { id: 'cli-019', name: 'Sabrina Campos', cpf: '165.820.493-77', phone: '(85) 99450-3201', gender: 'F', age: 27, lastPurchase: '2023-12-21', acceptsContact: false },
  { id: 'cli-020', name: 'Tiago Moreira', cpf: '298.451.760-58', phone: '(51) 99961-2845', gender: 'M', age: 41, lastPurchase: '2024-02-19', acceptsContact: true },
  { id: 'cli-021', name: 'Ursula Duarte', cpf: '437.912.685-16', phone: '(61) 99215-4300', gender: 'F', age: 33, lastPurchase: '2024-04-05', acceptsContact: true },
  { id: 'cli-022', name: 'Victor Monteiro', cpf: '589.134.702-94', phone: '(48) 99644-7520', gender: 'M', age: 38, lastPurchase: '2024-05-25', acceptsContact: false },
  { id: 'cli-023', name: 'Wagner Pires', cpf: '630.745.918-21', phone: '(27) 99102-8844', gender: 'M', age: 47, lastPurchase: '2023-11-30', acceptsContact: true },
  { id: 'cli-024', name: 'Ximena Vasconcelos', cpf: '784.509.632-47', phone: '(41) 98330-2299', gender: 'F', age: 36, lastPurchase: '2024-03-29', acceptsContact: true },
  { id: 'cli-025', name: 'Yasmin Silveira', cpf: '895.621.473-30', phone: '(31) 99704-6633', gender: 'F', age: 22, lastPurchase: '2024-06-14', acceptsContact: false },
  { id: 'cli-026', name: 'Zoe Albuquerque', cpf: '906.482.157-02', phone: '(11) 99541-7765', gender: 'F', age: 40, lastPurchase: '2024-05-06', acceptsContact: true },
  { id: 'cli-027', name: 'Arthur Rezende', cpf: '174.368.920-15', phone: '(62) 98140-5032', gender: 'M', age: 44, lastPurchase: '2023-12-28', acceptsContact: true },
  { id: 'cli-028', name: 'Bianca Castro', cpf: '285.417.639-88', phone: '(21) 99912-4418', gender: 'F', age: 31, lastPurchase: '2024-04-02', acceptsContact: false },
  { id: 'cli-029', name: 'Caio Furtado', cpf: '346.598.721-63', phone: '(51) 98422-9087', gender: 'M', age: 27, lastPurchase: '2024-01-18', acceptsContact: true },
  { id: 'cli-030', name: 'Daniela Freitas', cpf: '452.830.617-49', phone: '(85) 99167-5540', gender: 'F', age: 34, lastPurchase: '2024-03-23', acceptsContact: true },
  { id: 'cli-031', name: 'Eduardo Neves', cpf: '573.019.468-25', phone: '(41) 98812-7099', gender: 'M', age: 29, lastPurchase: '2024-02-13', acceptsContact: false },
  { id: 'cli-032', name: 'Fernanda Prado', cpf: '614.782.950-81', phone: '(31) 99678-1204', gender: 'F', age: 37, lastPurchase: '2024-05-31', acceptsContact: true },
  { id: 'cli-033', name: 'Gustavo Queiroz', cpf: '768.135.240-06', phone: '(11) 98331-4475', gender: 'M', age: 42, lastPurchase: '2024-04-21', acceptsContact: false },
  { id: 'cli-034', name: 'Helena Sales', cpf: '820.946.315-57', phone: '(19) 99520-6614', gender: 'F', age: 25, lastPurchase: '2024-03-02', acceptsContact: true },
  { id: 'cli-035', name: 'Igor Luz', cpf: '931.278.540-19', phone: '(21) 98745-3098', gender: 'M', age: 33, lastPurchase: '2024-01-29', acceptsContact: true },
  { id: 'cli-036', name: 'Julia Couto', cpf: '146.780.392-84', phone: '(31) 99238-7741', gender: 'F', age: 30, lastPurchase: '2023-10-24', acceptsContact: false },
  { id: 'cli-037', name: 'Kleber Assis', cpf: '257.409.863-72', phone: '(11) 98411-5120', gender: 'M', age: 46, lastPurchase: '2024-02-27', acceptsContact: true },
  { id: 'cli-038', name: 'Larissa Bittencourt', cpf: '369.548.102-95', phone: '(47) 99934-2860', gender: 'F', age: 28, lastPurchase: '2024-05-19', acceptsContact: true },
  { id: 'cli-039', name: 'Marcelo Braga', cpf: '480.921.675-08', phone: '(31) 99155-7342', gender: 'M', age: 51, lastPurchase: '2024-06-09', acceptsContact: false },
  { id: 'cli-040', name: 'Natalia Ribeiro', cpf: '592.310.468-71', phone: '(21) 98703-6250', gender: 'F', age: 35, lastPurchase: '2023-12-14', acceptsContact: true },
  { id: 'cli-041', name: 'Otavio Paes', cpf: '603.784.219-44', phone: '(48) 99561-2044', gender: 'M', age: 39, lastPurchase: '2024-05-08', acceptsContact: true },
  { id: 'cli-042', name: 'Priscila Matos', cpf: '745.820.193-56', phone: '(62) 98208-6112', gender: 'F', age: 32, lastPurchase: '2024-02-08', acceptsContact: false },
  { id: 'cli-043', name: 'Renato Siqueira', cpf: '897.153.604-20', phone: '(11) 98474-9081', gender: 'M', age: 26, lastPurchase: '2024-04-17', acceptsContact: true },
  { id: 'cli-044', name: 'Silvia Paiva', cpf: '918.265.740-68', phone: '(31) 99902-3374', gender: 'F', age: 45, lastPurchase: '2023-11-03', acceptsContact: true },
  { id: 'cli-045', name: 'Tales Moura', cpf: '129.476.830-42', phone: '(41) 99205-8831', gender: 'M', age: 28, lastPurchase: '2024-05-02', acceptsContact: false },
  { id: 'cli-046', name: 'Viviane Lopes', cpf: '230.568.914-37', phone: '(85) 99188-4206', gender: 'F', age: 41, lastPurchase: '2024-01-23', acceptsContact: true },
  { id: 'cli-047', name: 'William Tavares', cpf: '341.789.205-69', phone: '(21) 99753-2840', gender: 'M', age: 36, lastPurchase: '2024-03-11', acceptsContact: true },
  { id: 'cli-048', name: 'Yago Martins', cpf: '452.890.316-17', phone: '(11) 98162-9098', gender: 'M', age: 24, lastPurchase: '2024-06-06', acceptsContact: false },
  { id: 'cli-049', name: 'Zilda Fonseca', cpf: '563.901.427-80', phone: '(31) 99831-6754', gender: 'F', age: 44, lastPurchase: '2023-09-27', acceptsContact: true },
  { id: 'cli-050', name: 'Adriano Caldas', cpf: '674.012.538-41', phone: '(27) 99206-5580', gender: 'M', age: 37, lastPurchase: '2024-05-27', acceptsContact: true },
  { id: 'cli-051', name: 'Brenda Melo', cpf: '785.103.249-50', phone: '(11) 99330-4012', gender: 'F', age: 29, lastPurchase: '2024-04-09', acceptsContact: false },
  { id: 'cli-052', name: 'Cristiano Lopes', cpf: '896.214.350-18', phone: '(61) 99142-8365', gender: 'M', age: 34, lastPurchase: '2024-02-01', acceptsContact: true },
  { id: 'cli-053', name: 'Denise Goulart', cpf: '907.325.461-80', phone: '(51) 99407-2231', gender: 'F', age: 38, lastPurchase: '2024-03-19', acceptsContact: true },
  { id: 'cli-054', name: 'Everton Paiva', cpf: '018.436.572-42', phone: '(31) 99840-1258', gender: 'M', age: 31, lastPurchase: '2023-12-05', acceptsContact: false },
  { id: 'cli-055', name: 'Fabiana Souza', cpf: '129.547.683-19', phone: '(41) 99508-7134', gender: 'F', age: 27, lastPurchase: '2024-06-12', acceptsContact: true },
  { id: 'cli-056', name: 'Gilberto Reis', cpf: '230.658.794-31', phone: '(21) 99327-5548', gender: 'M', age: 43, lastPurchase: '2024-01-14', acceptsContact: true },
  { id: 'cli-057', name: 'Heloisa Neri', cpf: '341.769.805-92', phone: '(11) 99615-8876', gender: 'F', age: 33, lastPurchase: '2024-04-25', acceptsContact: false },
  { id: 'cli-058', name: 'Jonas Mesquita', cpf: '452.870.916-54', phone: '(27) 99287-4403', gender: 'M', age: 30, lastPurchase: '2024-02-22', acceptsContact: true },
  { id: 'cli-059', name: 'Livia Peixoto', cpf: '563.981.027-36', phone: '(31) 99713-5208', gender: 'F', age: 28, lastPurchase: '2024-05-04', acceptsContact: true },
  { id: 'cli-060', name: 'Miguel Cunha', cpf: '674.092.138-70', phone: '(48) 99173-6040', gender: 'M', age: 26, lastPurchase: '2024-03-31', acceptsContact: false },
];

(function initializeClientsPage() {
  const clientsPageElement = document.querySelector('[data-page="clientes"]');
  if (!clientsPageElement) {
    return;
  }

  const clientsTableBody = clientsPageElement.querySelector('[data-role="clients-table-body"]');
  if (!clientsTableBody) {
    return;
  }

  const selectAllCheckbox = clientsPageElement.querySelector('[data-role="clients-select-all"]');
  const paginationInfo = clientsPageElement.querySelector('[data-role="clients-pagination-info"]');
  const paginationButtons = clientsPageElement.querySelectorAll('.clients-pagination__button');
  const filterInputs = clientsPageElement.querySelectorAll('[data-filter]');
  const sortButtons = clientsPageElement.querySelectorAll('.clients-table__sort');

  const state = {
    sortKey: null,
    sortDirection: 'asc',
    filters: {
      name: '',
      cpf: '',
      phone: '',
      gender: '',
      ageMin: '',
      ageMax: '',
      lastPurchaseStart: '',
      lastPurchaseEnd: '',
      acceptsContact: '',
    },
    page: 1,
    selectedIds: new Set(),
    columnWidths: {
      selection: 64,
      name: 220,
      cpf: 170,
      phone: 180,
      gender: 120,
      age: 130,
      lastPurchase: 180,
      acceptsContact: 180,
    },
  };

  let lastFilteredClients = [];

  function normalizeText(value) {
    return value ? value.toString().trim().toLowerCase() : '';
  }

  function sanitizeNumbers(value) {
    return value ? value.replace(/\D/g, '') : '';
  }

  function parseFilterDate(value) {
    const trimmed = normalizeText(value);
    if (!trimmed) {
      return null;
    }
    const parts = trimmed.split('/');
    if (parts.length !== 3) {
      return null;
    }
    const [dayPart, monthPart, yearPart] = parts;
    const day = Number(dayPart);
    const monthIndex = Number(monthPart) - 1;
    if (Number.isNaN(day) || Number.isNaN(monthIndex)) {
      return null;
    }
    let year = Number(yearPart);
    if (yearPart.length === 2) {
      year += 2000;
    }
    if (Number.isNaN(year)) {
      return null;
    }
    const date = new Date(year, monthIndex, day);
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== monthIndex ||
      date.getDate() !== day
    ) {
      return null;
    }
    return date;
  }

  function toDateFromISO(isoString) {
    return new Date(`${isoString}T00:00:00`);
  }

  function formatDisplayDate(isoString) {
    const date = toDateFromISO(isoString);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
  }

  function getFilteredClients() {
    const nameFilter = normalizeText(state.filters.name);
    const cpfFilter = sanitizeNumbers(state.filters.cpf);
    const phoneFilter = normalizeText(state.filters.phone);
    const genderFilter = normalizeText(state.filters.gender);
    const ageMin = state.filters.ageMin !== '' ? Number(state.filters.ageMin) : null;
    const ageMax = state.filters.ageMax !== '' ? Number(state.filters.ageMax) : null;
    const startDate = parseFilterDate(state.filters.lastPurchaseStart);
    const endDate = parseFilterDate(state.filters.lastPurchaseEnd);
    const acceptsFilterRaw = normalizeText(state.filters.acceptsContact);
    const acceptsFilter = acceptsFilterRaw
      ? acceptsFilterRaw.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      : '';

    return CLIENTS.filter((client) => {
      if (nameFilter && !normalizeText(client.name).includes(nameFilter)) {
        return false;
      }
      if (cpfFilter) {
        const clientCpf = sanitizeNumbers(client.cpf);
        if (!clientCpf.includes(cpfFilter)) {
          return false;
        }
      }
      if (phoneFilter && !normalizeText(client.phone).includes(phoneFilter)) {
        return false;
      }
      if (genderFilter) {
        const target = genderFilter[0];
        if (!normalizeText(client.gender).startsWith(target)) {
          return false;
        }
      }
      if (ageMin !== null && !Number.isNaN(ageMin) && client.age < ageMin) {
        return false;
      }
      if (ageMax !== null && !Number.isNaN(ageMax) && client.age > ageMax) {
        return false;
      }
      const purchaseDate = toDateFromISO(client.lastPurchase);
      if (startDate && purchaseDate < startDate) {
        return false;
      }
      if (endDate) {
        const inclusiveEnd = new Date(endDate);
        inclusiveEnd.setHours(23, 59, 59, 999);
        if (purchaseDate > inclusiveEnd) {
          return false;
        }
      }
      if (acceptsFilter) {
        const expectsYes = 'sim'.startsWith(acceptsFilter) || acceptsFilter === 's';
        const expectsNo = 'nao'.startsWith(acceptsFilter) || acceptsFilter === 'n';
        if (expectsYes && !client.acceptsContact) {
          return false;
        }
        if (expectsNo && client.acceptsContact) {
          return false;
        }
        if (!expectsYes && !expectsNo) {
          return false;
        }
      }
      return true;
    });
  }

  function sortClients(clients) {
    if (!state.sortKey) {
      return [...clients];
    }

    const sorted = [...clients];
    const comparators = {
      name: (a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }),
      gender: (a, b) => a.gender.localeCompare(b.gender, 'pt-BR'),
      age: (a, b) => a.age - b.age,
      lastPurchase: (a, b) => toDateFromISO(a.lastPurchase) - toDateFromISO(b.lastPurchase),
      acceptsContact: (a, b) => Number(a.acceptsContact) - Number(b.acceptsContact),
    };

    const comparator = comparators[state.sortKey];
    if (!comparator) {
      return sorted;
    }

    sorted.sort((a, b) => {
      const comparison = comparator(a, b);
      if (comparison === 0) {
        return 0;
      }
      return state.sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }

  function updateSortIndicators() {
    sortButtons.forEach((button) => {
      button.classList.remove('is-sorted-asc', 'is-sorted-desc');
      if (state.sortKey === button.dataset.sort) {
        const className = state.sortDirection === 'desc' ? 'is-sorted-desc' : 'is-sorted-asc';
        button.classList.add(className);
      }
    });
  }

  function applyColumnWidths() {
    Object.entries(state.columnWidths).forEach(([columnId, width]) => {
      const header = clientsPageElement.querySelector(`.clients-table__column[data-column-id="${columnId}"]`);
      if (header) {
        header.style.width = `${width}px`;
        header.style.minWidth = `${width}px`;
      }
      clientsTableBody.querySelectorAll(`[data-column-id="${columnId}"]`).forEach((cell) => {
        cell.style.width = `${width}px`;
        cell.style.minWidth = `${width}px`;
      });
    });
  }

  function createTextCell(columnId, text, extraClass = '') {
    const cell = document.createElement('td');
    cell.className = `clients-table__cell${extraClass ? ` ${extraClass}` : ''}`;
    cell.dataset.columnId = columnId;
    cell.textContent = text;
    return cell;
  }

  function renderClients() {
    const filtered = getFilteredClients();
    const sorted = sortClients(filtered);
    lastFilteredClients = sorted;

    const totalPages = Math.max(1, Math.ceil(sorted.length / CLIENTS_PER_PAGE));
    if (state.page > totalPages) {
      state.page = totalPages;
    }

    const startIndex = (state.page - 1) * CLIENTS_PER_PAGE;
    const pageItems = sorted.slice(startIndex, startIndex + CLIENTS_PER_PAGE);

    clientsTableBody.innerHTML = '';

    if (!pageItems.length) {
      const emptyRow = document.createElement('tr');
      emptyRow.className = 'clients-table__row clients-table__row--empty';
      const emptyCell = document.createElement('td');
      emptyCell.className = 'clients-table__cell';
      emptyCell.colSpan = 8;
      emptyCell.textContent = 'Nenhum cliente encontrado com os filtros selecionados.';
      emptyRow.appendChild(emptyCell);
      clientsTableBody.appendChild(emptyRow);
      updatePagination(sorted.length);
      updateSelectAllState(sorted);
      applyColumnWidths();
      return;
    }

    const fragment = document.createDocumentFragment();

    pageItems.forEach((client) => {
      const row = document.createElement('tr');
      row.className = 'clients-table__row';

      const selectCell = document.createElement('td');
      selectCell.className = 'clients-table__cell clients-table__cell--select';
      selectCell.dataset.columnId = 'selection';
      const selectLabel = document.createElement('label');
      selectLabel.className = 'clients-checkbox';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.dataset.clientId = client.id;
      checkbox.checked = state.selectedIds.has(client.id);
      checkbox.setAttribute('aria-label', `Selecionar ${client.name}`);
      const custom = document.createElement('span');
      custom.className = 'clients-checkbox__custom';
      custom.setAttribute('aria-hidden', 'true');
      selectLabel.append(checkbox, custom);
      selectCell.appendChild(selectLabel);
      row.appendChild(selectCell);

      row.appendChild(createTextCell('name', client.name));
      row.appendChild(createTextCell('cpf', client.cpf));
      row.appendChild(createTextCell('phone', client.phone));
      row.appendChild(createTextCell('gender', client.gender));
      row.appendChild(createTextCell('age', String(client.age)));
      row.appendChild(createTextCell('lastPurchase', formatDisplayDate(client.lastPurchase)));

      const statusCell = document.createElement('td');
      statusCell.className = 'clients-table__cell';
      statusCell.dataset.columnId = 'acceptsContact';
      const statusWrapper = document.createElement('span');
      statusWrapper.className = 'clients-status';
      const statusDot = document.createElement('span');
      statusDot.className = `clients-status__dot${client.acceptsContact ? '' : ' is-no'}`;
      statusDot.setAttribute('aria-hidden', 'true');
      const statusLabel = document.createElement('span');
      statusLabel.className = 'clients-status__label';
      statusLabel.textContent = client.acceptsContact ? 'Sim' : 'Não';
      statusWrapper.append(statusDot, statusLabel);
      statusCell.appendChild(statusWrapper);
      row.appendChild(statusCell);

      fragment.appendChild(row);
    });

    clientsTableBody.appendChild(fragment);
    updatePagination(sorted.length);
    updateSelectAllState(sorted);
    applyColumnWidths();
  }

  function updatePagination(totalCount) {
    const totalPages = Math.max(1, Math.ceil(totalCount / CLIENTS_PER_PAGE));
    const hasResults = totalCount > 0;
    if (paginationInfo) {
      if (!hasResults) {
        paginationInfo.textContent = 'Nenhum cliente encontrado';
      } else {
        const startNumber = (state.page - 1) * CLIENTS_PER_PAGE + 1;
        const endNumber = Math.min(totalCount, state.page * CLIENTS_PER_PAGE);
        paginationInfo.textContent = `Mostrando ${startNumber}-${endNumber} de ${totalCount} clientes`;
      }
    }

    paginationButtons.forEach((button) => {
      const action = button.dataset.action;
      if (action === 'prev') {
        button.disabled = state.page <= 1 || !hasResults;
      } else if (action === 'next') {
        button.disabled = state.page >= totalPages || !hasResults;
      }
    });
  }

  function updateSelectAllState(filtered) {
    if (!selectAllCheckbox) {
      return;
    }
    if (!filtered.length) {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = false;
      selectAllCheckbox.disabled = true;
      return;
    }

    selectAllCheckbox.disabled = false;
    const selectedCount = filtered.reduce((count, client) => (
      state.selectedIds.has(client.id) ? count + 1 : count
    ), 0);

    if (selectedCount === 0) {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = false;
    } else if (selectedCount === filtered.length) {
      selectAllCheckbox.checked = true;
      selectAllCheckbox.indeterminate = false;
    } else {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = true;
    }
  }

  function mapFilterKey(attribute) {
    return attribute.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  function handleFilterChange(event) {
    const input = event.target;
    const filterKey = input.dataset.filter;
    if (!filterKey) {
      return;
    }
    const mappedKey = mapFilterKey(filterKey);
    if (!(mappedKey in state.filters)) {
      return;
    }
    state.filters[mappedKey] = input.value;
    state.page = 1;
    renderClients();
  }

  function handleSortClick(button) {
    const sortKey = button.dataset.sort;
    if (!sortKey) {
      return;
    }
    if (state.sortKey === sortKey) {
      if (state.sortDirection === 'asc') {
        state.sortDirection = 'desc';
      } else {
        state.sortKey = null;
        state.sortDirection = 'asc';
      }
    } else {
      state.sortKey = sortKey;
      state.sortDirection = 'asc';
    }
    updateSortIndicators();
    renderClients();
  }

  function handleSelectAllChange(event) {
    const isChecked = event.target.checked;
    const targetList = lastFilteredClients.length ? lastFilteredClients : getFilteredClients();
    if (isChecked) {
      targetList.forEach((client) => state.selectedIds.add(client.id));
    } else {
      targetList.forEach((client) => state.selectedIds.delete(client.id));
    }
    renderClients();
  }

  function handleRowSelectionChange(event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    const clientId = target.dataset.clientId;
    if (!clientId) {
      return;
    }
    if (target.checked) {
      state.selectedIds.add(clientId);
    } else {
      state.selectedIds.delete(clientId);
    }
    updateSelectAllState(lastFilteredClients);
  }

  function handlePaginationClick(event) {
    const action = event.currentTarget?.dataset.action;
    if (!action) {
      return;
    }
    const totalPages = Math.max(1, Math.ceil(lastFilteredClients.length / CLIENTS_PER_PAGE));
    if (action === 'prev' && state.page > 1) {
      state.page -= 1;
      renderClients();
    } else if (action === 'next' && state.page < totalPages) {
      state.page += 1;
      renderClients();
    }
  }

  function initializeColumnResizers() {
    const resizers = clientsPageElement.querySelectorAll('.clients-table__resizer');
    resizers.forEach((resizer) => {
      const header = resizer.closest('.clients-table__column');
      const columnId = header?.dataset.columnId;
      if (!columnId) {
        return;
      }
      resizer.addEventListener('mousedown', (event) => {
        event.preventDefault();
        const startX = event.clientX;
        const startWidth = state.columnWidths[columnId] || header.offsetWidth;

        function onMouseMove(moveEvent) {
          const delta = moveEvent.clientX - startX;
          const minWidth = columnId === 'selection' ? 48 : 100;
          const newWidth = Math.max(minWidth, Math.min(420, startWidth + delta));
          state.columnWidths[columnId] = newWidth;
          applyColumnWidths();
        }

        function onMouseUp() {
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
          document.body.style.userSelect = '';
          document.body.classList.remove('is-resizing');
        }

        document.body.style.userSelect = 'none';
        document.body.classList.add('is-resizing');
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
      });
    });
  }

  filterInputs.forEach((input) => {
    input.addEventListener('input', handleFilterChange);
  });

  sortButtons.forEach((button) => {
    button.addEventListener('click', () => handleSortClick(button));
  });

  selectAllCheckbox?.addEventListener('change', handleSelectAllChange);
  clientsTableBody.addEventListener('change', handleRowSelectionChange);
  paginationButtons.forEach((button) => {
    button.addEventListener('click', handlePaginationClick);
  });

  applyColumnWidths();
  initializeColumnResizers();
  updateSortIndicators();
  renderClients();
})();
