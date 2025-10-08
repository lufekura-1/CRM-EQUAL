'use strict';

const USER_TYPE_LABELS = {
  MF: 'Multifocal',
  BF: 'Bifocal',
  VS: 'Visão Simples',
};

const CLIENT_STATE_LABELS = {
  'pos-venda': 'Pós-venda',
  oferta: 'Oferta',
  'nao-contatar': 'Não contatar',
};

const CLIENT_INTEREST_OPTIONS = ['Visão Simples', 'Multifocal', 'Bifocal', 'Solar', 'Relógios', 'Jóias'];

const FRAME_MATERIAL_LABELS = {
  METAL: 'Metal',
  ACETATO: 'Acetato',
  TITANIUM: 'Titanium',
  OUTROS: 'Outros',
};

const FRAME_MATERIAL_VALUES = Object.keys(FRAME_MATERIAL_LABELS);
const USER_TYPE_VALUES = Object.keys(USER_TYPE_LABELS);
const CLIENT_STATE_VALUES = Object.keys(CLIENT_STATE_LABELS);

const CLIENTS_PER_PAGE = 25;

const CLIENTS = [];

(function normalizeClientData() {
  const now = new Date();

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function toIsoDate(date) {
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    return `${year}-${month}-${day}`;
  }

  function generateBirthDate(age, index) {
    const target = new Date(now);
    target.setFullYear(now.getFullYear() - age);
    target.setMonth(index % 12);
    target.setDate((index % 27) + 1);
    if (target > now) {
      target.setFullYear(target.getFullYear() - 1);
    }
    return toIsoDate(target);
  }

  function shiftMonths(baseDate, months) {
    const date = new Date(baseDate);
    date.setMonth(date.getMonth() + months);
    return date;
  }

  function createPurchase(client, index, offset) {
    const baseDate = client.lastPurchase ? new Date(`${client.lastPurchase}T00:00:00`) : now;
    const purchaseDate = offset === 0 ? baseDate : shiftMonths(baseDate, offset);
    const isoDate = toIsoDate(purchaseDate);
    const valueSeed = index * 7 + Math.abs(offset) * 5;
    const frameValue = 680 + valueSeed * 4;
    const lensValue = 420 + valueSeed * 3;

    const dioptryBase = (index % 3) + Math.abs(offset);
    const materialIndex = ((index + offset) % FRAME_MATERIAL_VALUES.length + FRAME_MATERIAL_VALUES.length) % FRAME_MATERIAL_VALUES.length;
    const frameMaterial = FRAME_MATERIAL_VALUES[materialIndex] || FRAME_MATERIAL_VALUES[0];

    return {
      id: `${client.id}-purchase-${offset + 3}`,
      date: isoDate,
      frame: `Armação Elite ${String.fromCharCode(65 + (index % 26))}`,
      frameMaterial,
      frameValue,
      lens: `Lente Vision ${1 + (index % 4)}`,
      lensValue,
      invoice: `NF-${client.id.toUpperCase()}-${90 + Math.abs(offset)}`,
      dioptry: {
        oe: {
          spherical: (dioptryBase * -0.25).toFixed(2),
          cylindrical: (dioptryBase * -0.25).toFixed(2),
          axis: 45 + dioptryBase * 5,
          dnp: 30 + dioptryBase,
          addition: (1 + dioptryBase * 0.25).toFixed(2),
        },
        od: {
          spherical: (dioptryBase * -0.25 + 0.25).toFixed(2),
          cylindrical: (dioptryBase * -0.25 + 0.25).toFixed(2),
          axis: 90 + dioptryBase * 4,
          dnp: 31 + dioptryBase,
          addition: (1 + dioptryBase * 0.3).toFixed(2),
        },
      },
    };
  }

  function computeAge(iso) {
    const date = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return 0;
    }
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
      age -= 1;
    }
    return Math.max(age, 0);
  }

  CLIENTS.forEach((client, index) => {
    if (!client.birthDate) {
      client.birthDate = generateBirthDate(client.age, index);
    }

    const purchases = [createPurchase(client, index, -6), createPurchase(client, index, -3), createPurchase(client, index, 0)]
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    purchases.forEach((purchase, purchaseIndex) => {
      if (!purchase.frameMaterial) {
        const materialIndex = (index + purchaseIndex) % FRAME_MATERIAL_VALUES.length;
        purchase.frameMaterial = FRAME_MATERIAL_VALUES[materialIndex];
      }
    });

    client.purchases = purchases;
    const latestPurchase = purchases[purchases.length - 1];
    client.lastPurchase = latestPurchase?.date || client.lastPurchase;
    client.age = computeAge(client.birthDate) || client.age;

    if (!client.userType) {
      client.userType = USER_TYPE_VALUES[index % USER_TYPE_VALUES.length];
    }

    if (!client.state) {
      client.state = CLIENT_STATE_VALUES[index % CLIENT_STATE_VALUES.length];
    }

    if (!Array.isArray(client.interests) || client.interests.length === 0) {
      const interestCount = (index % 3) + 1;
      const startIndex = index % CLIENT_INTEREST_OPTIONS.length;
      client.interests = Array.from({ length: interestCount }, (_, offset) => {
        const interestIndex = (startIndex + offset) % CLIENT_INTEREST_OPTIONS.length;
        return CLIENT_INTEREST_OPTIONS[interestIndex];
      });
    }
  });
})();

let clientsLoading = false;
let clientsErrorMessage = '';
let clientsLoadedOnce = false;
let clientsFetchPromise = null;
let isSavingClient = false;
let isDeletingClient = false;
let isSavingQuickSale = false;

(function initializeClientsPage() {
  const clientsPageElement = document.querySelector(
    '.content__page[data-page="clientes"]'
  );
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
      userType: '',
      clientState: '',
      interestIncludes: [],
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
    detail: {
      purchases: {
        openId: null,
        scrollTop: 0,
      },
      contacts: {
        openPurchaseId: null,
        focusedContactId: null,
        scrollTop: 0,
      },
    },
    currentClientId: null,
  };

  let lastFilteredClients = [];

  function refreshClientInCaches(client) {
    if (!client) {
      return;
    }
    const index = lastFilteredClients.findIndex((item) => item.id === client.id);
    if (index >= 0) {
      lastFilteredClients.splice(index, 1, client);
    }
  }

  function removeClientFromCaches(clientId) {
    if (!clientId) {
      return;
    }
    const index = lastFilteredClients.findIndex((item) => item.id === clientId);
    if (index >= 0) {
      lastFilteredClients.splice(index, 1);
    }
  }

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

  function patchElement(element, { text, attributes = {}, dataset = {}, classList = {} } = {}) {
    if (!(element instanceof Element)) {
      return element;
    }

    if (text !== undefined && element.textContent !== text) {
      element.textContent = text;
    }

    Object.entries(attributes).forEach(([name, value]) => {
      if (value === null || value === undefined || value === false) {
        element.removeAttribute(name);
      } else {
        const stringValue = String(value);
        if (element.getAttribute(name) !== stringValue) {
          element.setAttribute(name, stringValue);
        }
      }
    });

    Object.entries(dataset).forEach(([name, value]) => {
      if (value === null || value === undefined) {
        delete element.dataset[name];
      } else {
        const stringValue = String(value);
        if (element.dataset[name] !== stringValue) {
          element.dataset[name] = stringValue;
        }
      }
    });

    if (Array.isArray(classList.add)) {
      classList.add.forEach((className) => {
        element.classList.add(className);
      });
    }

    if (Array.isArray(classList.remove)) {
      classList.remove.forEach((className) => {
        element.classList.remove(className);
      });
    }

    if (classList.toggle && typeof classList.toggle === 'object') {
      Object.entries(classList.toggle).forEach(([className, enabled]) => {
        element.classList.toggle(className, Boolean(enabled));
      });
    }

    return element;
  }

  function getCurrentClientId() {
    return state.currentClientId ?? null;
  }

  function setCurrentClient(client) {
    if (client?.id) {
      state.currentClientId = String(client.id);
    } else {
      state.currentClientId = null;
    }
  }

  function getCurrentClientData() {
    const currentId = getCurrentClientId();
    return currentId ? findClientById(currentId) : null;
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
    const userTypeFilter = state.filters.userType;
    const clientStateFilter = state.filters.clientState;
    const interestFilters = Array.isArray(state.filters.interestIncludes)
      ? state.filters.interestIncludes
          .map((interest) => interest?.toString().trim().toLowerCase())
          .filter(Boolean)
      : [];

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
      if (userTypeFilter && client.userType !== userTypeFilter) {
        return false;
      }
      if (clientStateFilter && client.state !== clientStateFilter) {
        return false;
      }
      if (interestFilters.length) {
        const normalizedInterests = Array.isArray(client.interests)
          ? client.interests
              .map((interest) => interest?.toString().trim().toLowerCase())
              .filter(Boolean)
          : [];
        const hasMatch = interestFilters.some((interest) => normalizedInterests.includes(interest));
        if (!hasMatch) {
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

  function createSelectionCell(client) {
    const cell = document.createElement('td');
    cell.className = 'clients-table__cell clients-table__cell--select';
    cell.dataset.columnId = 'selection';
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
    cell.appendChild(selectLabel);
    return cell;
  }

  function createNameCell(client) {
    const cell = document.createElement('td');
    cell.className = 'clients-table__cell clients-table__cell--name';
    cell.dataset.columnId = 'name';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'clients-table__link';
    button.dataset.clientId = client.id;
    button.dataset.action = 'open-client-detail';
    button.textContent = client.name;
    cell.appendChild(button);
    return cell;
  }

  function createClientRowElement(client) {
    const row = document.createElement('tr');
    row.className = 'clients-table__row';
    row.dataset.clientId = client.id;

    row.append(
      createSelectionCell(client),
      createNameCell(client),
      createTextCell('cpf', client.cpf),
      createTextCell('phone', client.phone),
      createTextCell('gender', client.gender),
      createTextCell('age', String(client.age)),
      createTextCell('lastPurchase', formatDisplayDate(client.lastPurchase)),
    );

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

    return row;
  }

  function calculateAgeFromBirthDate(isoString) {
    if (!isoString) {
      return '';
    }
    const birthDate = new Date(`${isoString}T00:00:00`);
    if (Number.isNaN(birthDate.getTime())) {
      return '';
    }
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age -= 1;
    }
    return Math.max(age, 0);
  }

  function formatFullDate(isoString) {
    if (!isoString) {
      return '';
    }
    const date = new Date(`${isoString}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return '';
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  function formatContactTitle(months) {
    if (!Number.isFinite(months)) {
      return 'Contato';
    }
    if (months === 1) {
      return 'Contato de 1 mês';
    }
    return `Contato de ${months} meses`;
  }

  function formatCurrencyBRL(value) {
    const numberValue = Number(value) || 0;
    return numberValue.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    });
  }

  function getLatestPurchase(client) {
    if (!client?.purchases?.length) {
      return null;
    }
    return client.purchases.reduce((latest, current) => (
      new Date(current.date) > new Date(latest.date) ? current : latest
    ));
  }

  function getApiErrorMessage(error, fallback) {
    if (window.api?.getErrorMessage) {
      return window.api.getErrorMessage(error, fallback);
    }

    if (error?.message) {
      return error.message;
    }

    if (typeof error === 'string') {
      return error;
    }

    return fallback;
  }

  function createStatusRow(message, status = 'info') {
    const row = document.createElement('tr');
    row.className = 'clients-table__row clients-table__row--empty';
    row.dataset.status = status;
    const cell = document.createElement('td');
    cell.className = 'clients-table__cell';
    cell.colSpan = 8;
    cell.textContent = message;
    row.appendChild(cell);
    return row;
  }

  function mapApiContact(contact) {
    if (!contact) {
      return null;
    }

    const rawId = contact.id ?? contact.contactId ?? contact.contato_id ?? contact.contatoId;
    if (!rawId && rawId !== 0) {
      return null;
    }

    const rawPurchaseId = contact.purchaseId ?? contact.compraId ?? contact.compra_id ?? null;
    const rawContactDate =
      contact.contactDate ?? contact.dataContato ?? contact.data_contato ?? contact.date ?? contact.data ?? '';
    const rawPurchaseDate = contact.purchaseDate ?? contact.dataCompra ?? contact.data_compra ?? null;
    const monthsRaw = contact.monthsOffset ?? contact.prazoMeses ?? contact.prazo_meses ?? contact.meses;

    const contactDate = rawContactDate ? String(rawContactDate).slice(0, 10) : '';
    const purchaseDate = rawPurchaseDate ? String(rawPurchaseDate).slice(0, 10) : '';
    const monthsOffset = Number(monthsRaw);

    return {
      id: String(rawId),
      purchaseId: rawPurchaseId ? String(rawPurchaseId) : '',
      clientId: contact.clientId ?? contact.cliente_id ?? '',
      purchaseDate,
      contactDate,
      monthsOffset: Number.isFinite(monthsOffset) ? monthsOffset : null,
      completed: Boolean(contact.completed ?? contact.efetuado ?? contact.realizado),
      completedAt: contact.completedAt ?? contact.efetuadoEm ?? contact.efetuado_em ?? null,
      createdAt: contact.createdAt ?? contact.created_at ?? null,
      updatedAt: contact.updatedAt ?? contact.updated_at ?? null,
    };
  }

  function mapApiPurchase(purchase) {
    if (!purchase) {
      return null;
    }

    const rawDate = purchase.date ?? purchase.data;
    if (!rawDate) {
      return null;
    }

    const rawFrameMaterial =
      purchase.frameMaterial ?? purchase.materialArmacao ?? purchase.material_armacao ?? '';

    function toNumber(value) {
      if (value === undefined || value === null || value === '') {
        return null;
      }
      const numeric = Number(value);
      return Number.isNaN(numeric) ? null : numeric;
    }

    function normalizeEyeField(value) {
      if (value === undefined || value === null) {
        return null;
      }
      const text = String(value).trim();
      return text.length === 0 ? null : text;
    }

    function normalizeEye(source) {
      return {
        spherical: normalizeEyeField(
          source?.spherical ?? source?.esferico ?? source?.esférico ?? source?.sphere
        ),
        cylindrical: normalizeEyeField(
          source?.cylindrical ?? source?.cilindrico ?? source?.cilíndrico ?? source?.cylinder
        ),
        axis: normalizeEyeField(source?.axis ?? source?.eixo),
        dnp: normalizeEyeField(source?.dnp),
        addition: normalizeEyeField(source?.addition ?? source?.adicao ?? source?.adição),
      };
    }

    const dioptrySource = purchase.dioptry ?? purchase.dioptria ?? {};
    const oeSource = dioptrySource.oe || {};
    const odSource = dioptrySource.od || {};

    const id = purchase.id ?? purchase.purchaseId ?? purchase.compra_id ?? rawDate;

    const contactsSource = Array.isArray(purchase.contacts)
      ? purchase.contacts
      : Array.isArray(purchase.contatos)
        ? purchase.contatos
        : [];
    const contacts = contactsSource
      .map((item) => mapApiContact(item))
      .filter((item) => Boolean(item))
      .sort((a, b) => {
        const monthsA = Number.isFinite(a.monthsOffset) ? a.monthsOffset : Number.MAX_SAFE_INTEGER;
        const monthsB = Number.isFinite(b.monthsOffset) ? b.monthsOffset : Number.MAX_SAFE_INTEGER;
        if (monthsA !== monthsB) {
          return monthsA - monthsB;
        }
        return (a.contactDate || '').localeCompare(b.contactDate || '');
      });

    return {
      id: String(id),
      date: String(rawDate).slice(0, 10),
      frame: purchase.frame ?? purchase.armacao ?? '',
      frameMaterial: rawFrameMaterial ? String(rawFrameMaterial).toUpperCase() : '',
      frameValue:
        toNumber(purchase.frameValue ?? purchase.valorArmacao ?? purchase.valor_armacao) ?? 0,
      lens: purchase.lens ?? purchase.lente ?? '',
      lensValue:
        toNumber(purchase.lensValue ?? purchase.valorLente ?? purchase.valor_lente) ?? 0,
      invoice: purchase.invoice ?? purchase.notaFiscal ?? purchase.nota_fiscal ?? '',
      dioptry: {
        oe: normalizeEye(oeSource),
        od: normalizeEye(odSource),
      },
      contacts,
    };
  }

  function mapApiClient(apiClient) {
    if (!apiClient) {
      return null;
    }

    const rawId = apiClient.id ?? apiClient.cliente_id ?? '';
    const id = String(rawId || Date.now());
    const purchasesSource = Array.isArray(apiClient.purchases)
      ? apiClient.purchases
      : Array.isArray(apiClient.compras)
        ? apiClient.compras
        : [];
    const purchases = purchasesSource
      .map((item) => mapApiPurchase(item))
      .filter((item) => Boolean(item));

    const contactsSource = Array.isArray(apiClient.contacts)
      ? apiClient.contacts
      : Array.isArray(apiClient.contatos)
        ? apiClient.contatos
        : [];
    const contacts = contactsSource.map((item) => mapApiContact(item)).filter((item) => Boolean(item));

    if (!contacts.length && purchases.length) {
      purchases.forEach((purchase) => {
        if (Array.isArray(purchase.contacts)) {
          purchase.contacts.forEach((contact) => {
            contacts.push(contact);
          });
        }
      });
    }

    if (!purchases.length && apiClient.compra) {
      const singlePurchase = mapApiPurchase(apiClient.compra);
      if (singlePurchase) {
        purchases.push(singlePurchase);
      }
    }

    const client = {
      id,
      name: apiClient.nome ?? apiClient.name ?? '',
      cpf: apiClient.cpf ?? apiClient.documento ?? '',
      phone: apiClient.telefone ?? apiClient.phone ?? '',
      gender: apiClient.gender ?? apiClient.genero ?? '',
      birthDate:
        apiClient.birthDate ?? apiClient.dataNascimento ?? apiClient.data_nascimento ?? '',
      acceptsContact: Boolean(
        apiClient.acceptsContact ?? apiClient.aceitaContato ?? apiClient['aceita_contato'] ?? false
      ),
      age: apiClient.age ?? '',
      userType:
        apiClient.userType ??
        apiClient.tipoUsuario ??
        apiClient['tipo_usuario'] ??
        USER_TYPE_VALUES[0] ??
        'VS',
      state:
        apiClient.state ??
        apiClient.estadoCliente ??
        apiClient['estado_cliente'] ??
        CLIENT_STATE_VALUES[0] ??
        'pos-venda',
      interests: Array.isArray(apiClient.interests)
        ? apiClient.interests.slice()
        : Array.isArray(apiClient.interesses)
          ? apiClient.interesses.slice()
          : [],
      purchases,
      contacts,
      lastPurchase:
        apiClient.lastPurchase ??
        apiClient.ultimaCompra ??
        apiClient['ultima_compra'] ??
        purchases[purchases.length - 1]?.date ??
        '',
      email: apiClient.email ?? '',
      createdAt: apiClient.created_at ?? apiClient.createdAt ?? '',
    };

    client.gender = client.gender ? client.gender.toUpperCase() : '';
    client.userType = client.userType ? client.userType.toUpperCase() : USER_TYPE_VALUES[0] ?? 'VS';
    client.state = client.state ? client.state.toLowerCase() : CLIENT_STATE_VALUES[0] ?? 'pos-venda';
    client.interests = Array.from(
      new Set(
        (client.interests || [])
          .map((interest) => (interest === undefined || interest === null ? null : String(interest).trim()))
          .filter((interest) => interest && interest.length > 0)
      )
    );

    if (client.birthDate) {
      const computedAge = calculateAgeFromBirthDate(client.birthDate);
      client.age = computedAge || client.age || '';
    }

    return client;
  }

  function upsertClientFromApi(apiClient, { preferPrepend = false } = {}) {
    const mappedClient = mapApiClient(apiClient);
    if (!mappedClient) {
      throw new Error('Resposta de cliente inválida.');
    }

    const existingIndex = CLIENTS.findIndex((item) => item.id === mappedClient.id);
    if (existingIndex >= 0) {
      CLIENTS.splice(existingIndex, 1, mappedClient);
    } else if (preferPrepend) {
      CLIENTS.unshift(mappedClient);
    } else {
      CLIENTS.push(mappedClient);
    }

    return mappedClient;
  }

  async function fetchClientsPage(page = 1) {
    const response = await window.api.getClients({ page });
    const clientes = Array.isArray(response?.clientes) ? response.clientes : [];
    const totalPages = Number(response?.totalPages ?? page);
    return { clientes, totalPages: Number.isFinite(totalPages) ? totalPages : 1 };
  }

  async function fetchAllClients() {
    const aggregated = [];
    let page = 1;
    let totalPages = 1;

    do {
      const { clientes, totalPages: fetchedTotal } = await fetchClientsPage(page);
      aggregated.push(...clientes);
      totalPages = fetchedTotal || 1;
      if (!totalPages || page >= totalPages) {
        break;
      }
      page += 1;
    } while (true);

    return aggregated;
  }

  async function loadClientsFromApi({ force = false } = {}) {
    if (clientsLoading && clientsFetchPromise) {
      await clientsFetchPromise;
      return;
    }

    if (clientsLoadedOnce && !force) {
      return;
    }

    clientsLoading = true;
    clientsErrorMessage = '';
    renderClients();

    clientsFetchPromise = (async () => {
      try {
        const apiClients = await fetchAllClients();
        const mappedClients = apiClients
          .map((item) => mapApiClient(item))
          .filter((item) => Boolean(item));

        CLIENTS.splice(0, CLIENTS.length, ...mappedClients);
        clientsLoadedOnce = true;
        clientsErrorMessage = '';
        state.selectedIds.clear();
        state.page = 1;
        const currentId = getCurrentClientId();
        if (currentId && !CLIENTS.some((client) => client.id === currentId)) {
          setCurrentClient(null);
        }
      } catch (error) {
        clientsErrorMessage = getApiErrorMessage(error, 'Não foi possível carregar os clientes.');
        if (typeof window.showToast === 'function') {
          window.showToast(clientsErrorMessage, { type: 'error' });
        }
      } finally {
        clientsLoading = false;
        clientsFetchPromise = null;
        renderClients();
        ensureDetailButtonState();
        updateAdvancedButtonState();
      }
    })();

    await clientsFetchPromise;
  }

  function renderClients() {
    if (!clientsTableBody) {
      return;
    }

    clientsTableBody.innerHTML = '';

    if (clientsLoading) {
      clientsTableBody.appendChild(createStatusRow('Carregando clientes...', 'loading'));
      updatePagination(0, { isLoading: true });
      updateSelectAllState([]);
      applyColumnWidths();
      updateAdvancedButtonState();
      return;
    }

    const hasAnyClient = CLIENTS.length > 0;

    if (clientsErrorMessage && !hasAnyClient) {
      clientsTableBody.appendChild(createStatusRow(clientsErrorMessage, 'error'));
      updatePagination(0, { hasError: true });
      updateSelectAllState([]);
      applyColumnWidths();
      updateAdvancedButtonState();
      return;
    }

    const filtered = getFilteredClients();
    const sorted = sortClients(filtered);
    lastFilteredClients = sorted;

    const totalPages = Math.max(1, Math.ceil(sorted.length / CLIENTS_PER_PAGE));
    if (state.page > totalPages) {
      state.page = totalPages;
    }

    const startIndex = (state.page - 1) * CLIENTS_PER_PAGE;
    const pageItems = sorted.slice(startIndex, startIndex + CLIENTS_PER_PAGE);

    if (!pageItems.length) {
      const emptyRow = createStatusRow(
        'Nenhum cliente encontrado com os filtros selecionados.',
        'empty',
      );
      clientsTableBody.appendChild(emptyRow);
      updatePagination(sorted.length);
      updateSelectAllState(sorted);
      applyColumnWidths();
      updateAdvancedButtonState();
      return;
    }

    const fragment = document.createDocumentFragment();

    pageItems.forEach((client) => {
      fragment.appendChild(createClientRowElement(client));
    });

    clientsTableBody.appendChild(fragment);
    updatePagination(sorted.length);
    updateSelectAllState(sorted);
    applyColumnWidths();
    updateAdvancedButtonState();
  }

  function ensureDetailButtonState() {
    if (!clientsDetailButton) {
      return;
    }
    const hasClient = Boolean(getCurrentClientId());
    clientsDetailButton.disabled = !hasClient;
  }

  function findClientById(clientId) {
    return CLIENTS.find((client) => client.id === clientId) || null;
  }

  function resetClientDetailState() {
    state.detail.purchases.openId = null;
    state.detail.purchases.scrollTop = 0;
    state.detail.contacts.openPurchaseId = null;
    state.detail.contacts.focusedContactId = null;
    state.detail.contacts.scrollTop = 0;
  }

  function renderClientDetail(client) {
    if (!clientDetailFields || !clientPurchasesContainer) {
      return;
    }

    updateQuickSaleButtonState(client);

    const age = calculateAgeFromBirthDate(client.birthDate);
    const genderLabel =
      client.gender === 'F' ? 'Feminino' : client.gender === 'M' ? 'Masculino' : '-';

    const detailMap = {
      name: client.name,
      cpf: client.cpf,
      phone: client.phone,
      gender: genderLabel,
      birthDate: formatFullDate(client.birthDate),
      age: age ? `${age} anos` : '-',
      userType: USER_TYPE_LABELS[client.userType] ?? '-',
      state: CLIENT_STATE_LABELS[client.state] ?? '-',
      acceptsContact: client.acceptsContact ? 'Sim' : 'Não',
    };

    clientDetailFields.forEach((field) => {
      if (!(field instanceof HTMLElement)) {
        return;
      }
      const key = field.dataset.clientField;
      if (!key) {
        return;
      }
      const value = detailMap[key] ?? '-';
      field.textContent = value;
      if (key === 'state') {
        field.dataset.state = client.state || '';
      }
    });

    renderClientInterests(client);
    renderPurchaseHistory(client);
    renderClientContacts(client);
  }

  function createMetaItem(label, value) {
    const wrapper = document.createElement('div');
    wrapper.className = 'client-purchase__meta-item';
    const labelSpan = document.createElement('span');
    labelSpan.textContent = label;
    const valueSpan = document.createElement('span');
    valueSpan.textContent = value;
    wrapper.append(labelSpan, valueSpan);
    return wrapper;
  }

  function createDioptryTable(dioptry) {
    const table = document.createElement('table');
    table.className = 'client-purchase__table';
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['', 'Esférico', 'Cilíndrico', 'Eixo', 'DNP', 'Adição'].forEach((label) => {
      const cell = document.createElement('th');
      cell.textContent = label;
      headerRow.appendChild(cell);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    ['oe', 'od'].forEach((eye) => {
      const row = document.createElement('tr');
      const eyeLabel = document.createElement('th');
      eyeLabel.textContent = eye === 'oe' ? 'OE' : 'OD';
      row.appendChild(eyeLabel);
      const values = dioptry?.[eye] || {};
      ['spherical', 'cylindrical', 'axis', 'dnp', 'addition'].forEach((key) => {
        const valueCell = document.createElement('td');
        valueCell.textContent = values[key] ?? '-';
        row.appendChild(valueCell);
      });
      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    return table;
  }

  function renderClientInterests(client) {
    if (!clientInterestsContainer) {
      return;
    }
    clientInterestsContainer.innerHTML = '';
    const interests = Array.isArray(client.interests)
      ? Array.from(
          new Set(
            client.interests
              .map((interest) => interest?.toString().trim())
              .filter((interest) => Boolean(interest))
          )
        )
      : [];

    if (!interests.length) {
      const empty = document.createElement('p');
      empty.className = 'client-interests__empty';
      empty.textContent = 'Nenhum interesse cadastrado.';
      clientInterestsContainer.appendChild(empty);
      return;
    }

    interests.forEach((interest) => {
      const tag = document.createElement('span');
      tag.className = 'client-interest-tag';
      tag.textContent = interest;
      clientInterestsContainer.appendChild(tag);
    });
  }

  function formatFrameMaterial(material) {
    if (!material) {
      return '-';
    }
    return FRAME_MATERIAL_LABELS[material] ?? material;
  }

  function renderPurchaseHistory(client) {
    const storedScrollTop = state.detail.purchases.scrollTop ?? clientPurchasesContainer.scrollTop;
    const storedOpenId = state.detail.purchases.openId;

    clientPurchasesContainer.innerHTML = '';
    if (!client.purchases?.length) {
      const placeholder = document.createElement('div');
      placeholder.className = 'client-card__empty';
      placeholder.textContent = 'Nenhuma compra cadastrada.';
      clientPurchasesContainer.appendChild(placeholder);
      state.detail.purchases.openId = null;
      state.detail.purchases.scrollTop = 0;
      return;
    }

    const latestPurchase = getLatestPurchase(client);

    client.purchases
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .forEach((purchase) => {
        const article = document.createElement('article');
        article.className = 'client-purchase';
        const purchaseId = purchase.id ? String(purchase.id) : '';
        if (purchaseId) {
          article.dataset.purchaseId = purchaseId;
        }
        if (storedOpenId) {
          if (purchaseId && purchaseId === storedOpenId) {
            article.classList.add('is-open');
          }
        } else if (purchase === latestPurchase) {
          article.classList.add('is-open');
        }

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'client-purchase__toggle';
        toggle.dataset.purchaseId = purchase.id;
        toggle.innerHTML = `
          <span>${formatFullDate(purchase.date)}</span>
          <span>${formatCurrencyBRL((Number(purchase.frameValue) || 0) + (Number(purchase.lensValue) || 0))}</span>
        `;

        const details = document.createElement('div');
        details.className = 'client-purchase__details';

        const meta = document.createElement('div');
        meta.className = 'client-purchase__meta';
        meta.append(
          createMetaItem('Armação', purchase.frame),
          createMetaItem('Material da armação', formatFrameMaterial(purchase.frameMaterial)),
          createMetaItem('Valor da armação', formatCurrencyBRL(purchase.frameValue)),
          createMetaItem('Lente', purchase.lens),
          createMetaItem('Valor da lente', formatCurrencyBRL(purchase.lensValue)),
          createMetaItem('Nota Fiscal', purchase.invoice)
        );

        const dioptryTable = createDioptryTable(purchase.dioptry);

        details.append(meta, dioptryTable);
        article.append(toggle, details);
        clientPurchasesContainer.appendChild(article);
      });

    if (!clientPurchasesContainer.querySelector('.client-purchase.is-open')) {
      const firstArticle = clientPurchasesContainer.querySelector('.client-purchase');
      if (firstArticle) {
        firstArticle.classList.add('is-open');
      }
    }

    const openArticle = clientPurchasesContainer.querySelector('.client-purchase.is-open');
    state.detail.purchases.openId = openArticle?.dataset.purchaseId ?? null;

    const maxScrollTop = Math.max(
      0,
      clientPurchasesContainer.scrollHeight - clientPurchasesContainer.clientHeight,
    );
    const nextScrollTop = Math.min(Math.max(storedScrollTop, 0), maxScrollTop);
    clientPurchasesContainer.scrollTop = nextScrollTop;
    state.detail.purchases.scrollTop = nextScrollTop;
  }

  function renderClientContacts(client) {
    if (!clientContactHistoryContainer) {
      return;
    }

    const storedScrollTop = state.detail.contacts.scrollTop ?? clientContactHistoryContainer.scrollTop;
    const storedOpenPurchaseId = state.detail.contacts.openPurchaseId;
    const storedFocusedContactId = state.detail.contacts.focusedContactId;

    clientContactHistoryContainer.innerHTML = '';

    const purchasesWithContacts = Array.isArray(client.purchases)
      ? client.purchases
          .map((purchase) => ({
            ...purchase,
            contacts: Array.isArray(purchase.contacts) ? purchase.contacts.slice() : [],
          }))
          .filter((purchase) => purchase.contacts.length > 0)
      : [];

    if (!purchasesWithContacts.length) {
      const placeholder = document.createElement('div');
      placeholder.className = 'client-card__empty';
      placeholder.textContent = 'Nenhum contato registrado.';
      clientContactHistoryContainer.appendChild(placeholder);
      state.detail.contacts.openPurchaseId = null;
      state.detail.contacts.focusedContactId = null;
      state.detail.contacts.scrollTop = 0;
      return;
    }

    let buttonToFocus = null;

    purchasesWithContacts
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .forEach((purchase, index) => {
        const article = document.createElement('article');
        article.className = 'client-contact';
        const purchaseId = purchase.id ? String(purchase.id) : '';
        if (purchaseId) {
          article.dataset.purchaseId = purchaseId;
        }
        if (storedOpenPurchaseId) {
          if (purchaseId && purchaseId === storedOpenPurchaseId) {
            article.classList.add('is-open');
          }
        } else if (index === 0) {
          article.classList.add('is-open');
        }

        const pendingCount = purchase.contacts.filter((contact) => !contact.completed).length;
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'client-contact__toggle';
        toggle.dataset.purchaseId = purchase.id;
        toggle.innerHTML = `
          <span>${formatFullDate(purchase.date)}</span>
          <span>${pendingCount === 0 ? 'Todos concluídos' : `${pendingCount} pendente(s)`}</span>
        `;

        const details = document.createElement('div');
        details.className = 'client-contact__details';

        const list = document.createElement('div');
        list.className = 'client-contact__list';

        purchase.contacts
          .slice()
          .sort((a, b) => {
            const monthsA = Number.isFinite(a.monthsOffset) ? a.monthsOffset : Number.MAX_SAFE_INTEGER;
            const monthsB = Number.isFinite(b.monthsOffset) ? b.monthsOffset : Number.MAX_SAFE_INTEGER;
            if (monthsA !== monthsB) {
              return monthsA - monthsB;
            }
            return (a.contactDate || '').localeCompare(b.contactDate || '');
          })
          .forEach((contact) => {
            const item = document.createElement('div');
            item.className = 'client-contact__item';
            if (contact.id) {
              item.dataset.contactId = String(contact.id);
            }

            const label = document.createElement('div');
            label.className = 'client-contact__label';
            label.innerHTML = `
              <span>${formatContactTitle(contact.monthsOffset)}</span>
              <span>${formatFullDate(contact.contactDate)}</span>
            `;

            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'client-contact__status';
            button.dataset.contactId = contact.id;
            button.dataset.completed = contact.completed ? 'true' : 'false';
            button.textContent = contact.completed ? 'Efetuado' : 'Pendente';
            if (contact.completed) {
              button.classList.add('is-completed');
            }
            if (storedFocusedContactId && contact.id && String(contact.id) === storedFocusedContactId) {
              buttonToFocus = button;
            }

            item.append(label, button);
            list.appendChild(item);
          });

        details.appendChild(list);
        article.append(toggle, details);
        clientContactHistoryContainer.appendChild(article);
      });

    if (!clientContactHistoryContainer.querySelector('.client-contact.is-open')) {
      const firstArticle = clientContactHistoryContainer.querySelector('.client-contact');
      if (firstArticle) {
        firstArticle.classList.add('is-open');
      }
    }

    const openArticle = clientContactHistoryContainer.querySelector('.client-contact.is-open');
    state.detail.contacts.openPurchaseId = openArticle?.dataset.purchaseId ?? null;

    const maxScrollTop = Math.max(
      0,
      clientContactHistoryContainer.scrollHeight - clientContactHistoryContainer.clientHeight,
    );
    const nextScrollTop = Math.min(Math.max(storedScrollTop, 0), maxScrollTop);
    clientContactHistoryContainer.scrollTop = nextScrollTop;
    state.detail.contacts.scrollTop = nextScrollTop;

    if (buttonToFocus) {
      try {
        buttonToFocus.focus({ preventScroll: true });
      } catch (error) {
        buttonToFocus.focus();
      }
    }
    state.detail.contacts.focusedContactId = null;
  }

  function updateQuickSaleButtonState(client) {
    if (!clientQuickSaleButton) {
      return;
    }
    const hasClient = Boolean(client?.id);
    clientQuickSaleButton.disabled = !hasClient;
  }

  function attachButtonHandler(element, handler) {
    if (!element || typeof handler !== 'function') {
      return;
    }

    if (element instanceof HTMLButtonElement && element.type !== 'button') {
      element.type = 'button';
    }

    element.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      handler(event);
    });
  }

  function prepareQuickSaleForm(client) {
    if (!clientQuickSaleForm) {
      return;
    }

    clientQuickSaleForm.reset();

    const latestPurchase = client ? getLatestPurchase(client) : null;
    const todayIso = new Date().toISOString().slice(0, 10);

    const dateField = clientQuickSaleForm.elements.namedItem('saleDate');
    if (dateField instanceof HTMLInputElement) {
      dateField.value = todayIso;
    }

    const frameField = clientQuickSaleForm.elements.namedItem('saleFrame');
    if (frameField instanceof HTMLInputElement) {
      frameField.value = '';
    }

    const lensField = clientQuickSaleForm.elements.namedItem('saleLens');
    if (lensField instanceof HTMLInputElement) {
      lensField.value = '';
    }

    const frameValueField = clientQuickSaleForm.elements.namedItem('saleFrameValue');
    if (frameValueField instanceof HTMLInputElement) {
      frameValueField.value = '';
    }

    const lensValueField = clientQuickSaleForm.elements.namedItem('saleLensValue');
    if (lensValueField instanceof HTMLInputElement) {
      lensValueField.value = '';
    }

    const invoiceField = clientQuickSaleForm.elements.namedItem('saleInvoice');
    if (invoiceField instanceof HTMLInputElement) {
      invoiceField.value = '';
    }

    const materialField = clientQuickSaleForm.elements.namedItem('saleFrameMaterial');
    if (materialField instanceof HTMLSelectElement) {
      const preferred = latestPurchase?.frameMaterial || '';
      const hasOption = Array.from(materialField.options).some(
        (option) => option.value === preferred
      );
      if (preferred && hasOption) {
        materialField.value = preferred;
      } else {
        materialField.value = '';
      }
    }
  }

  function collectQuickSaleFormData() {
    if (!clientQuickSaleForm) {
      return null;
    }

    const formData = new FormData(clientQuickSaleForm);
    const dateRaw = formData.get('saleDate');
    const dateValue = dateRaw ? dateRaw.toString() : '';
    if (!dateValue) {
      return null;
    }

    function toTrimmed(value) {
      return value === undefined || value === null ? '' : value.toString().trim();
    }

    function toNumberValue(value) {
      const text = toTrimmed(value);
      if (!text) {
        return null;
      }
      const normalized = Number(text.replace(',', '.'));
      return Number.isFinite(normalized) ? normalized : null;
    }

    const frameMaterialRaw = toTrimmed(formData.get('saleFrameMaterial'));

    return {
      date: dateValue,
      frame: toTrimmed(formData.get('saleFrame')),
      frameMaterial: frameMaterialRaw ? frameMaterialRaw.toUpperCase() : '',
      frameValue: toNumberValue(formData.get('saleFrameValue')),
      lens: toTrimmed(formData.get('saleLens')),
      lensValue: toNumberValue(formData.get('saleLensValue')),
      invoice: toTrimmed(formData.get('saleInvoice')),
    };
  }

  function closeQuickSaleModal() {
    if (clientQuickSaleForm) {
      clientQuickSaleForm.reset();
    }
    if (clientQuickSaleSaveButton) {
      clientQuickSaleSaveButton.disabled = false;
    }
    isSavingQuickSale = false;
    if (typeof window.clearInlineFeedback === 'function') {
      window.clearInlineFeedback(clientQuickSaleForm);
    }
    closeOverlay(clientQuickSaleOverlay);
  }

  function openQuickSaleModal() {
    const client = getCurrentClientData();
    if (!client || !clientQuickSaleOverlay) {
      return;
    }
    prepareQuickSaleForm(client);
    if (typeof window.clearInlineFeedback === 'function') {
      window.clearInlineFeedback(clientQuickSaleForm);
    }
    openOverlay(clientQuickSaleOverlay);
  }

  function handleQuickSaleOverlayClick(event) {
    if (!(event.target instanceof Element)) {
      return;
    }
    if (!event.target.closest('.modal')) {
      closeQuickSaleModal();
    }
  }

  async function submitQuickSaleForm() {
    if (isSavingQuickSale) {
      return;
    }
    if (!clientQuickSaleForm?.reportValidity()) {
      return;
    }

    if (typeof window.clearInlineFeedback === 'function') {
      window.clearInlineFeedback(clientQuickSaleForm);
    }

    const client = getCurrentClientData();
    if (!client) {
      return;
    }

    const data = collectQuickSaleFormData();
    if (!data) {
      return;
    }

    const purchasePayload = {
      date: data.date,
      frame: data.frame,
      frameMaterial: data.frameMaterial || null,
      frameValue: data.frameValue,
      lens: data.lens,
      lensValue: data.lensValue,
      invoice: data.invoice,
    };

    const successMessage = 'Venda registrada com sucesso.';
    const errorMessage = 'Erro ao registrar a venda.';

    try {
      isSavingQuickSale = true;
      if (clientQuickSaleSaveButton) {
        clientQuickSaleSaveButton.disabled = true;
      }

      const response = await window.api.updateClient(client.id, { purchase: purchasePayload });
      const apiClient = response?.cliente;
      if (!apiClient) {
        throw new Error('Resposta inválida do servidor.');
      }

      const updatedClient = upsertClientFromApi(apiClient);
      setCurrentClient(updatedClient);
      refreshClientInCaches(updatedClient);
      renderClientDetail(updatedClient);
      const rowUpdated = updateClientRow(updatedClient);
      if (!rowUpdated) {
        renderClients();
      }
      ensureDetailButtonState();
      updateQuickSaleButtonState(updatedClient);

      if (typeof window.showToast === 'function') {
        window.showToast(successMessage, { type: 'success' });
      }
      if (typeof window.showInlineFeedback === 'function') {
        window.showInlineFeedback(clientQuickSaleForm, successMessage, {
          type: 'success',
        });
      }

      prepareQuickSaleForm(updatedClient);
    } catch (error) {
      const message = getApiErrorMessage(error, errorMessage);
      if (typeof window.showToast === 'function') {
        window.showToast(message, { type: 'error' });
      }
      if (typeof window.showInlineFeedback === 'function') {
        window.showInlineFeedback(clientQuickSaleForm, message, { type: 'error' });
      }
    } finally {
      if (clientQuickSaleSaveButton) {
        clientQuickSaleSaveButton.disabled = false;
      }
      isSavingQuickSale = false;
    }
  }

  async function handleQuickSaleSubmit(event) {
    event.preventDefault();
    if (event && typeof event.stopPropagation === 'function') {
      event.stopPropagation();
    }
    await submitQuickSaleForm();
  }

  function handleQuickSaleSaveClick(event) {
    event.preventDefault();
    if (event && typeof event.stopPropagation === 'function') {
      event.stopPropagation();
    }
    submitQuickSaleForm();
  }

  function ensureAdvancedSelectOptions() {
    if (!clientsAdvancedSelects) {
      return;
    }
    clientsAdvancedSelects.forEach((select) => {
      if (!(select instanceof HTMLSelectElement)) {
        return;
      }
      const { advancedSelect } = select.dataset;
      if (advancedSelect === 'userType') {
        if (select.options.length > USER_TYPE_VALUES.length) {
          return;
        }
        select.innerHTML = '';
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Todos';
        select.appendChild(defaultOption);
        USER_TYPE_VALUES.forEach((value) => {
          const option = document.createElement('option');
          option.value = value;
          option.textContent = USER_TYPE_LABELS[value] ?? value;
          select.appendChild(option);
        });
      } else if (advancedSelect === 'clientState') {
        if (select.options.length > CLIENT_STATE_VALUES.length) {
          return;
        }
        select.innerHTML = '';
        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.textContent = 'Todos';
        select.appendChild(defaultOption);
        CLIENT_STATE_VALUES.forEach((value) => {
          const option = document.createElement('option');
          option.value = value;
          option.textContent = CLIENT_STATE_LABELS[value] ?? value;
          select.appendChild(option);
        });
      }
    });
  }

  function ensureInterestCheckboxes(container, fieldName) {
    if (!container) {
      return;
    }
    const existing = container.querySelectorAll('input[type="checkbox"]').length;
    if (existing >= CLIENT_INTEREST_OPTIONS.length) {
      return;
    }
    container.innerHTML = '';
    CLIENT_INTEREST_OPTIONS.forEach((interest) => {
      const label = document.createElement('label');
      label.className = 'modal__checkbox';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.name = fieldName;
      input.value = interest;
      const text = document.createElement('span');
      text.textContent = interest;
      label.append(input, text);
      container.appendChild(label);
    });
  }

  function setCheckboxSelections(container, values) {
    if (!container) {
      return;
    }
    const selected = new Set(
      Array.isArray(values) ? values.map((value) => value?.toString()) : []
    );
    container.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      checkbox.checked = selected.has(checkbox.value);
    });
  }

  function setFilterInputValue(filterName, value) {
    if (!clientsPageElement) {
      return;
    }
    const input = clientsPageElement.querySelector(`[data-filter="${filterName}"]`);
    if (input instanceof HTMLInputElement) {
      input.value = value ?? '';
    }
  }

  function hasActiveAdvancedFilters() {
    const hasUserType = Boolean(state.filters.userType);
    const hasClientState = Boolean(state.filters.clientState);
    const hasInterests = Array.isArray(state.filters.interestIncludes)
      ? state.filters.interestIncludes.length > 0
      : false;
    return hasUserType || hasClientState || hasInterests;
  }

  function updateAdvancedButtonState() {
    if (!clientsAdvancedSearchButton) {
      return;
    }
    clientsAdvancedSearchButton.classList.toggle('is-filter-active', hasActiveAdvancedFilters());
  }

  function updatePagination(totalCount, { isLoading = false, hasError = false } = {}) {
    const totalPages = Math.max(1, Math.ceil(totalCount / CLIENTS_PER_PAGE));
    const hasResults = totalCount > 0;

    if (paginationInfo) {
      if (isLoading) {
        paginationInfo.textContent = 'Carregando clientes...';
      } else if (hasError) {
        paginationInfo.textContent = 'Não foi possível carregar os clientes.';
      } else if (!hasResults) {
        paginationInfo.textContent = 'Nenhum cliente encontrado';
      } else {
        const startNumber = (state.page - 1) * CLIENTS_PER_PAGE + 1;
        const endNumber = Math.min(totalCount, state.page * CLIENTS_PER_PAGE);
        paginationInfo.textContent = `Mostrando ${startNumber}-${endNumber} de ${totalCount} clientes`;
      }
    }

    paginationButtons.forEach((button) => {
      const action = button.dataset.action;
      if (isLoading || hasError) {
        button.disabled = true;
        return;
      }
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

    if (mappedKey === 'ageMin' || mappedKey === 'ageMax') {
      const rawValue = input.value.replace(/\D/g, '').slice(0, 2);
      const sanitizedValue = rawValue ? String(Math.min(Number(rawValue), 99)) : '';
      input.value = sanitizedValue;
      state.filters[mappedKey] = sanitizedValue;
    } else {
      state.filters[mappedKey] = input.value;
    }
    state.page = 1;
    renderClients();
    updateAdvancedButtonState();
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

  function handlePurchaseToggle(event) {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const button = target.closest('.client-purchase__toggle');
    if (!button) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const article = button.closest('.client-purchase');
    if (!article) {
      return;
    }

    const isOpen = article.classList.contains('is-open');
    clientPurchasesContainer
      ?.querySelectorAll('.client-purchase')
      .forEach((purchase) => {
        purchase.classList.remove('is-open');
      });

    if (!isOpen) {
      article.classList.add('is-open');
      state.detail.purchases.openId = article.dataset.purchaseId ?? null;
    } else {
      state.detail.purchases.openId = null;
    }
    state.detail.purchases.scrollTop = clientPurchasesContainer?.scrollTop ?? 0;
  }

  function handleContactHistoryClick(event) {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const toggle = target.closest('.client-contact__toggle');
    if (toggle) {
      event.preventDefault();
      event.stopPropagation();
      const article = toggle.closest('.client-contact');
      if (!article) {
        return;
      }
      const isOpen = article.classList.contains('is-open');
      clientContactHistoryContainer
        ?.querySelectorAll('.client-contact')
        .forEach((contact) => contact.classList.remove('is-open'));
      if (!isOpen) {
        article.classList.add('is-open');
        state.detail.contacts.openPurchaseId = article.dataset.purchaseId ?? null;
      } else {
        state.detail.contacts.openPurchaseId = null;
      }
      state.detail.contacts.scrollTop = clientContactHistoryContainer?.scrollTop ?? 0;
      return;
    }

    const statusButton = target.closest('.client-contact__status');
    if (statusButton instanceof HTMLButtonElement) {
      event.preventDefault();
      event.stopPropagation();
      handleContactStatusButton(statusButton);
    }
  }

  async function handleContactStatusButton(button) {
    const contactId = button.dataset.contactId;
    if (!contactId) {
      return;
    }

    const parentContact = button.closest('.client-contact');
    state.detail.contacts.focusedContactId = contactId;
    if (parentContact instanceof HTMLElement) {
      state.detail.contacts.openPurchaseId = parentContact.dataset.purchaseId
        ?? state.detail.contacts.openPurchaseId;
    }
    state.detail.contacts.scrollTop = clientContactHistoryContainer?.scrollTop ?? 0;

    const currentlyCompleted = button.dataset.completed === 'true';
    const nextValue = !currentlyCompleted;
    const successMessage = nextValue
      ? 'Contato marcado como efetuado.'
      : 'Contato marcado como pendente.';
    const errorMessage = 'Erro ao atualizar o contato.';

    try {
      button.disabled = true;
      const response = await window.api.updateContact(contactId, { completed: nextValue });
      const apiClient = response?.cliente;

      if (apiClient) {
        handleContactUpdateResponse(apiClient, { contactId });
        if (typeof window.showToast === 'function') {
          window.showToast(successMessage, { type: 'success' });
        }
      }
    } catch (error) {
      const message = getApiErrorMessage(error, errorMessage);
      if (typeof window.showToast === 'function') {
        window.showToast(message, { type: 'error' });
      }
    } finally {
      button.disabled = false;
    }
  }

  function findClientContactContext(client, contactId) {
    if (!client || !contactId) {
      return null;
    }

    const normalizedId = String(contactId);
    if (!normalizedId) {
      return null;
    }

    let matchedContact = null;
    let matchedPurchase = null;

    if (Array.isArray(client.purchases)) {
      client.purchases.some((purchase) => {
        if (!Array.isArray(purchase.contacts)) {
          return false;
        }
        const foundContact = purchase.contacts.find((contact) => String(contact.id) === normalizedId);
        if (foundContact) {
          matchedContact = foundContact;
          matchedPurchase = purchase;
          return true;
        }
        return false;
      });
    }

    if (!matchedContact && Array.isArray(client.contacts)) {
      matchedContact = client.contacts.find((contact) => String(contact.id) === normalizedId) || null;
    }

    if (!matchedContact) {
      return null;
    }

    return {
      contact: matchedContact,
      purchase: matchedPurchase,
    };
  }

  function updateContactStatusButtonUI(contact) {
    if (!contact || !clientContactHistoryContainer) {
      return null;
    }

    const button = clientContactHistoryContainer.querySelector(
      `.client-contact__status[data-contact-id="${contact.id}"]`,
    );

    if (!(button instanceof HTMLButtonElement)) {
      return null;
    }

    const isCompleted = Boolean(contact.completed);
    patchElement(button, {
      dataset: { completed: isCompleted ? 'true' : 'false' },
      classList: { toggle: { 'is-completed': isCompleted } },
      text: isCompleted ? 'Efetuado' : 'Pendente',
    });
    return button;
  }

  function updatePurchasePendingLabel(purchase) {
    if (!purchase || !clientContactHistoryContainer) {
      return;
    }

    const purchaseId = purchase.id ? String(purchase.id) : '';
    const articleSelector = purchaseId
      ? `.client-contact[data-purchase-id="${purchaseId}"]`
      : '.client-contact';
    const article = clientContactHistoryContainer.querySelector(articleSelector);

    if (!(article instanceof HTMLElement)) {
      return;
    }

    if (purchaseId) {
      patchElement(article, { dataset: { purchaseId } });
    }

    const toggle = article.querySelector('.client-contact__toggle');
    if (!toggle) {
      return;
    }

    const spans = toggle.querySelectorAll('span');
    if (spans.length < 2) {
      return;
    }

    const pendingCount = Array.isArray(purchase.contacts)
      ? purchase.contacts.filter((item) => !item.completed).length
      : 0;
    const pendingText = pendingCount === 0 ? 'Todos concluídos' : `${pendingCount} pendente(s)`;
    patchElement(spans[1], { text: pendingText });
  }

  function updateClientContactHistoryUI(client, contactId) {
    if (!client || !clientContactHistoryContainer) {
      return null;
    }

    const context = findClientContactContext(client, contactId);
    if (!context?.contact) {
      renderClientContacts(client);
      return null;
    }

    const button = updateContactStatusButtonUI(context.contact);
    if (context.purchase) {
      updatePurchasePendingLabel(context.purchase);
    }

    if (button) {
      button.focus();
    }

    return context;
  }

  function updateClientRow(client) {
    if (!clientsTableBody || !client) {
      return false;
    }

    const row = clientsTableBody.querySelector(
      `.clients-table__row[data-client-id="${client.id}"]`,
    );

    if (!(row instanceof HTMLTableRowElement)) {
      return false;
    }

    patchElement(row, { dataset: { clientId: client.id } });

    const checkbox = row.querySelector('input[type="checkbox"][data-client-id]');
    if (checkbox instanceof HTMLInputElement) {
      checkbox.checked = state.selectedIds.has(client.id);
      checkbox.dataset.clientId = client.id;
    }

    const nameCell = row.querySelector('[data-column-id="name"]');
    const nameButton = nameCell?.querySelector('button[data-action="open-client-detail"]');
    if (nameButton) {
      patchElement(nameButton, {
        text: client.name,
        dataset: { clientId: client.id },
      });
    }

    const updateText = (columnId, value) => {
      const cell = row.querySelector(`[data-column-id="${columnId}"]`);
      if (cell) {
        patchElement(cell, { text: value });
      }
    };

    updateText('cpf', client.cpf);
    updateText('phone', client.phone);
    updateText('gender', client.gender);
    updateText('age', String(client.age));
    updateText('lastPurchase', formatDisplayDate(client.lastPurchase));

    const statusCell = row.querySelector('[data-column-id="acceptsContact"]');
    if (statusCell) {
      const wrapper = statusCell.querySelector('.clients-status');
      const dot = wrapper?.querySelector('.clients-status__dot');
      const label = wrapper?.querySelector('.clients-status__label');
      const acceptsContact = Boolean(client.acceptsContact);
      if (dot) {
        patchElement(dot, { classList: { toggle: { 'is-no': !acceptsContact } } });
      }
      if (label) {
        patchElement(label, { text: acceptsContact ? 'Sim' : 'Não' });
      }
    }

    return true;
  }

  function removeClientRow(clientId) {
    if (!clientsTableBody || !clientId) {
      return false;
    }
    const row = clientsTableBody.querySelector(
      `.clients-table__row[data-client-id="${clientId}"]`,
    );
    if (row) {
      row.remove();
      return true;
    }
    return false;
  }

  function notifyCalendarAboutContactUpdate(context, client) {
    if (!context?.contact) {
      return;
    }

    if (typeof window.updateCalendarContactEvent !== 'function') {
      return;
    }

    window.updateCalendarContactEvent({
      contact: context.contact,
      client,
      purchase: context.purchase || null,
    });
  }

  function handleContactUpdateResponse(apiClient, { contactId = null } = {}) {
    if (!apiClient) {
      return null;
    }

    const updatedClient = upsertClientFromApi(apiClient);
    setCurrentClient(updatedClient);
    refreshClientInCaches(updatedClient);
    if (contactId) {
      state.detail.contacts.focusedContactId = String(contactId);
    }

    const effectiveContactId = state.detail.contacts.focusedContactId;
    const context = effectiveContactId
      ? updateClientContactHistoryUI(updatedClient, effectiveContactId)
      : null;

    if (!context) {
      renderClientContacts(updatedClient);
    }

    updateClientRow(updatedClient);
    ensureDetailButtonState();
    updateQuickSaleButtonState(updatedClient);
    const calendarContext = context
      || (effectiveContactId ? findClientContactContext(updatedClient, effectiveContactId) : null);
    notifyCalendarAboutContactUpdate(calendarContext, updatedClient);
    return updatedClient;
  }

  function handleTableClick(event) {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const trigger = target.closest('button[data-action="open-client-detail"]');
    if (!trigger) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const clientId = trigger.dataset.clientId;
    const client = clientId ? findClientById(clientId) : null;
    if (!client) {
      return;
    }
    openClientDetail(client);
  }

  function handleDetailButtonClick() {
    const client = getCurrentClientData();
    if (!client) {
      return;
    }
    renderClientDetail(client);
    setActivePage('cliente-detalhe');
  }

  function prepareClientForm(mode = 'create', client = null) {
    if (!clientFormElement) {
      return;
    }
    clientFormElement.reset();
    if (typeof window.clearInlineFeedback === 'function') {
      window.clearInlineFeedback(clientFormElement);
    }
    clientFormElement.dataset.mode = mode;
    if (client?.id) {
      clientFormElement.dataset.clientId = client.id;
    } else {
      delete clientFormElement.dataset.clientId;
    }

    const todayIso = new Date().toISOString().slice(0, 10);
    const defaultBirthDate = '2000-01-01';
    const latestPurchase = client ? getLatestPurchase(client) : null;

    const fields = {
      name: client?.name ?? '',
      cpf: client?.cpf ?? '',
      phone: client?.phone ?? '',
      gender: client?.gender ?? '',
      userType: client?.userType ?? USER_TYPE_VALUES[0] ?? 'VS',
      birthDate: client?.birthDate ?? defaultBirthDate,
      acceptsContact: client?.acceptsContact ?? true,
      purchaseDate: latestPurchase?.date ?? todayIso,
      frame: latestPurchase?.frame ?? '',
      frameMaterial: latestPurchase?.frameMaterial ?? FRAME_MATERIAL_VALUES[0] ?? 'METAL',
      frameValue: latestPurchase?.frameValue ?? '',
      lens: latestPurchase?.lens ?? '',
      lensValue: latestPurchase?.lensValue ?? '',
      invoice: latestPurchase?.invoice ?? '',
      oeSpherical: latestPurchase?.dioptry?.oe?.spherical ?? '',
      oeCylindrical: latestPurchase?.dioptry?.oe?.cylindrical ?? '',
      oeAxis: latestPurchase?.dioptry?.oe?.axis ?? '',
      oeDnp: latestPurchase?.dioptry?.oe?.dnp ?? '',
      oeAddition: latestPurchase?.dioptry?.oe?.addition ?? '',
      odSpherical: latestPurchase?.dioptry?.od?.spherical ?? '',
      odCylindrical: latestPurchase?.dioptry?.od?.cylindrical ?? '',
      odAxis: latestPurchase?.dioptry?.od?.axis ?? '',
      odDnp: latestPurchase?.dioptry?.od?.dnp ?? '',
      odAddition: latestPurchase?.dioptry?.od?.addition ?? '',
    };

    Object.entries(fields).forEach(([name, value]) => {
      const input = clientFormElement.elements.namedItem(name);
      if (!input) {
        return;
      }
      if (input instanceof HTMLInputElement || input instanceof HTMLSelectElement) {
        if (input.type === 'checkbox') {
          input.checked = Boolean(value);
        } else {
          input.value = value ?? '';
        }
      }
    });

    if (mode === 'edit' && latestPurchase?.id) {
      clientFormElement.dataset.purchaseId = latestPurchase.id;
    } else {
      delete clientFormElement.dataset.purchaseId;
    }
  }

  function collectFormData() {
    if (!clientFormElement) {
      return null;
    }
    const formData = new FormData(clientFormElement);
    const acceptsContact = formData.get('acceptsContact') === 'on';
    const birthDate = formData.get('birthDate');
    const purchaseDate = formData.get('purchaseDate');
    const userType = formData.get('userType')?.toString().toUpperCase() ?? '';
    const frameMaterial = formData.get('frameMaterial')?.toString().toUpperCase() ?? '';

    return {
      name: formData.get('name')?.toString().trim() ?? '',
      cpf: formData.get('cpf')?.toString().trim() ?? '',
      phone: formData.get('phone')?.toString().trim() ?? '',
      gender: formData.get('gender')?.toString() ?? '',
      userType,
      birthDate: birthDate ? birthDate.toString() : '',
      acceptsContact,
      purchase: {
        date: purchaseDate ? purchaseDate.toString() : new Date().toISOString().slice(0, 10),
        frame: formData.get('frame')?.toString().trim() ?? '',
        frameMaterial: frameMaterial || FRAME_MATERIAL_VALUES[0] || 'METAL',
        frameValue: Number(formData.get('frameValue')) || 0,
        lens: formData.get('lens')?.toString().trim() ?? '',
        lensValue: Number(formData.get('lensValue')) || 0,
        invoice: formData.get('invoice')?.toString().trim() ?? '',
        dioptry: {
          oe: {
            spherical: formData.get('oeSpherical')?.toString() ?? '',
            cylindrical: formData.get('oeCylindrical')?.toString() ?? '',
            axis: formData.get('oeAxis')?.toString() ?? '',
            dnp: formData.get('oeDnp')?.toString() ?? '',
            addition: formData.get('oeAddition')?.toString() ?? '',
          },
          od: {
            spherical: formData.get('odSpherical')?.toString() ?? '',
            cylindrical: formData.get('odCylindrical')?.toString() ?? '',
            axis: formData.get('odAxis')?.toString() ?? '',
            dnp: formData.get('odDnp')?.toString() ?? '',
            addition: formData.get('odAddition')?.toString() ?? '',
          },
        },
      },
    };
  }

  async function handleClientFormSubmit(event) {
    event.preventDefault();
    if (event && typeof event.stopPropagation === 'function') {
      event.stopPropagation();
    }
    if (isSavingClient) {
      return;
    }

    if (typeof window.clearInlineFeedback === 'function') {
      window.clearInlineFeedback(clientFormElement);
    }

    const data = collectFormData();
    if (!data) {
      return;
    }

    const mode = clientFormElement?.dataset.mode === 'edit' ? 'edit' : 'create';
    const clientId = clientFormElement?.dataset.clientId;
    const birthDateIso = data.birthDate || new Date().toISOString().slice(0, 10);
    const purchasePayload = {
      date: data.purchase.date,
      frame: data.purchase.frame,
      frameMaterial: data.purchase.frameMaterial,
      frameValue: data.purchase.frameValue,
      lens: data.purchase.lens,
      lensValue: data.purchase.lensValue,
      invoice: data.purchase.invoice,
      dioptry: {
        oe: { ...data.purchase.dioptry.oe },
        od: { ...data.purchase.dioptry.od },
      },
    };

    const purchaseId = clientFormElement?.dataset.purchaseId || null;
    const apiPayload = {
      nome: data.name,
      telefone: data.phone || null,
      cpf: data.cpf || null,
      gender: data.gender || null,
      birthDate: birthDateIso,
      acceptsContact: data.acceptsContact,
      userType: data.userType,
      purchase: {
        ...purchasePayload,
        id: purchaseId,
      },
    };

    const successMessage = mode === 'edit'
      ? 'Cliente atualizado com sucesso.'
      : 'Cliente cadastrado com sucesso.';
    const errorMessage = mode === 'edit'
      ? 'Erro ao atualizar o cliente.'
      : 'Erro ao cadastrar o cliente.';

    try {
      isSavingClient = true;

      if (mode === 'edit' && clientId) {
        const response = await window.api.updateClient(clientId, apiPayload);
        const apiClient = response?.cliente;
        if (!apiClient) {
          throw new Error('Resposta inválida do servidor.');
        }

        const updatedClient = upsertClientFromApi(apiClient);
        setCurrentClient(updatedClient);
        refreshClientInCaches(updatedClient);
        renderClientDetail(updatedClient);
        prepareClientForm('edit', updatedClient);
        if (!updateClientRow(updatedClient)) {
          renderClients();
        }
      } else {
        const response = await window.api.createClient(apiPayload);
        const apiClient = response?.cliente;
        if (!apiClient) {
          throw new Error('Resposta inválida do servidor.');
        }

        const createdClient = upsertClientFromApi(apiClient, { preferPrepend: true });
        setCurrentClient(createdClient);
        refreshClientInCaches(createdClient);
        renderClientDetail(createdClient);
        prepareClientForm('edit', createdClient);
        if (!updateClientRow(createdClient)) {
          renderClients();
        }
      }

      if (typeof window.showToast === 'function') {
        window.showToast(successMessage, { type: 'success' });
      }
      if (typeof window.showInlineFeedback === 'function') {
        window.showInlineFeedback(clientFormElement, successMessage, {
        type: 'success',
      });
    }

      ensureDetailButtonState();
      updateQuickSaleButtonState(getCurrentClientData());
    } catch (error) {
      const message = getApiErrorMessage(error, errorMessage);
      if (typeof window.showToast === 'function') {
        window.showToast(message, { type: 'error' });
      }
      if (typeof window.showInlineFeedback === 'function') {
        window.showInlineFeedback(clientFormElement, message, { type: 'error' });
      }
    } finally {
      isSavingClient = false;
    }
  }

  function handleNewClientClick() {
    prepareClientForm('create');
    setActivePage('cadastro-cliente');
  }

  function handleClientDetailBack() {
    setActivePage('clientes');
  }

  function handleClientDetailEdit() {
    const client = getCurrentClientData();
    if (!client) {
      return;
    }
    prepareClientForm('edit', client);
    setActivePage('cadastro-cliente');
  }

  async function handleClientDetailDelete() {
    if (isDeletingClient) {
      return;
    }

    const client = getCurrentClientData();
    if (!client) {
      return;
    }

    const confirmed = window.confirm(`Deseja realmente excluir ${client.name}?`);
    if (!confirmed) {
      return;
    }

    try {
      isDeletingClient = true;
      await window.api.deleteClient(client.id);

      const index = CLIENTS.findIndex((item) => item.id === client.id);
      if (index >= 0) {
        CLIENTS.splice(index, 1);
      }

      state.selectedIds.delete(client.id);
      setCurrentClient(null);
      removeClientFromCaches(client.id);
      resetClientDetailState();
      updateQuickSaleButtonState(null);
      ensureDetailButtonState();
      const removedFromTable = removeClientRow(client.id);
      const remainingRows = clientsTableBody
        ? clientsTableBody.querySelectorAll('.clients-table__row').length
        : 0;
      if (!removedFromTable || remainingRows === 0) {
        renderClients();
      } else {
        updatePagination(lastFilteredClients.length);
        updateSelectAllState(lastFilteredClients);
      }
      setActivePage('clientes');

      if (typeof window.showToast === 'function') {
        window.showToast('Cliente excluído com sucesso.', { type: 'success' });
      }
    } catch (error) {
      const message = getApiErrorMessage(error, 'Erro ao excluir o cliente.');
      if (typeof window.showToast === 'function') {
        window.showToast(message, { type: 'error' });
      }
    } finally {
      isDeletingClient = false;
    }
  }

  function openClientDetail(client) {
    resetClientDetailState();
    setCurrentClient(client);
    ensureDetailButtonState();
    renderClientDetail(client);
    setActivePage('cliente-detalhe');
  }

  function closeAdvancedSearchModalInternal() {
    if (typeof window.clearInlineFeedback === 'function') {
      window.clearInlineFeedback(clientsAdvancedForm);
    }
    closeOverlay(clientsAdvancedOverlay);
  }

  function openAdvancedSearchModal() {
    ensureAdvancedSelectOptions();
    ensureInterestCheckboxes(clientsAdvancedInterestsContainer, 'advancedInterests');
    if (!clientsAdvancedOverlay) {
      return;
    }
    if (typeof window.clearInlineFeedback === 'function') {
      window.clearInlineFeedback(clientsAdvancedForm);
    }
    if (clientsAdvancedForm) {
      const userTypeField = clientsAdvancedForm.elements.namedItem('userType');
      if (userTypeField instanceof HTMLSelectElement) {
        userTypeField.value = state.filters.userType ?? '';
      }
      const clientStateField = clientsAdvancedForm.elements.namedItem('clientState');
      if (clientStateField instanceof HTMLSelectElement) {
        clientStateField.value = state.filters.clientState ?? '';
      }
      const acceptsField = clientsAdvancedForm.elements.namedItem('acceptsContact');
      if (acceptsField instanceof HTMLSelectElement) {
        const acceptsValue = state.filters.acceptsContact;
        if (acceptsValue === 'sim' || acceptsValue === 'nao') {
          acceptsField.value = acceptsValue;
        } else {
          acceptsField.value = '';
        }
      }
    }
    setCheckboxSelections(clientsAdvancedInterestsContainer, state.filters.interestIncludes);
    openOverlay(clientsAdvancedOverlay);
  }

  function handleAdvancedFormSubmit(event) {
    event.preventDefault();
    if (event && typeof event.stopPropagation === 'function') {
      event.stopPropagation();
    }
    if (!clientsAdvancedForm) {
      return;
    }
    if (typeof window.clearInlineFeedback === 'function') {
      window.clearInlineFeedback(clientsAdvancedForm);
    }
    const formData = new FormData(clientsAdvancedForm);
    const userTypeValue = formData.get('userType');
    const clientStateValue = formData.get('clientState');
    const acceptsValueRaw = formData.get('acceptsContact');
    const selectedInterests = formData
      .getAll('advancedInterests')
      .map((value) => value?.toString().trim())
      .filter((value) => Boolean(value));

    state.filters.userType = userTypeValue ? userTypeValue.toString() : '';
    state.filters.clientState = clientStateValue ? clientStateValue.toString() : '';
    const acceptsValue = acceptsValueRaw ? acceptsValueRaw.toString() : '';
    state.filters.acceptsContact = acceptsValue;
    state.filters.interestIncludes = selectedInterests;

    const acceptsDisplay = acceptsValue === 'sim' ? 'Sim' : acceptsValue === 'nao' ? 'Não' : '';
    setFilterInputValue('acceptsContact', acceptsDisplay);

    state.page = 1;
    renderClients();
    updateAdvancedButtonState();
    if (typeof window.showToast === 'function') {
      window.showToast('Filtros aplicados com sucesso.', { type: 'success' });
    }
    if (typeof window.showInlineFeedback === 'function') {
      window.showInlineFeedback(clientsAdvancedForm, 'Filtros aplicados com sucesso.', {
        type: 'success',
      });
    }
  }

  function handleAdvancedReset() {
    if (!clientsAdvancedForm) {
      return;
    }
    if (typeof window.clearInlineFeedback === 'function') {
      window.clearInlineFeedback(clientsAdvancedForm);
    }
    state.filters.userType = '';
    state.filters.clientState = '';
    state.filters.acceptsContact = '';
    state.filters.interestIncludes = [];
    clientsAdvancedForm.reset();
    setCheckboxSelections(clientsAdvancedInterestsContainer, []);
    setFilterInputValue('acceptsContact', '');
    state.page = 1;
    renderClients();
    updateAdvancedButtonState();
  }

  function closeClientInterestsModalInternal() {
    if (typeof window.clearInlineFeedback === 'function') {
      window.clearInlineFeedback(clientInterestsForm);
    }
    closeOverlay(clientInterestsOverlay);
  }

  function openClientInterestsModal() {
    const client = getCurrentClientData();
    if (!client) {
      return;
    }
    ensureInterestCheckboxes(clientInterestsOptionsContainer, 'interests');
    setCheckboxSelections(clientInterestsOptionsContainer, client.interests);
    if (typeof window.clearInlineFeedback === 'function') {
      window.clearInlineFeedback(clientInterestsForm);
    }
    openOverlay(clientInterestsOverlay);
  }

  function handleClientInterestsSubmit(event) {
    event.preventDefault();
    if (event && typeof event.stopPropagation === 'function') {
      event.stopPropagation();
    }
    if (typeof window.clearInlineFeedback === 'function') {
      window.clearInlineFeedback(clientInterestsForm);
    }
    const client = getCurrentClientData();
    if (!client || !clientInterestsForm) {
      return;
    }
    const formData = new FormData(clientInterestsForm);
    const selected = formData
      .getAll('interests')
      .map((value) => value?.toString().trim())
      .filter((value) => Boolean(value));
    client.interests = selected;
    renderClientInterests(client);
    refreshClientInCaches(client);
    if (!updateClientRow(client)) {
      renderClients();
    }
    updateAdvancedButtonState();
    if (typeof window.showToast === 'function') {
      window.showToast('Interesses atualizados com sucesso.', { type: 'success' });
    }
    if (typeof window.showInlineFeedback === 'function') {
      window.showInlineFeedback(clientInterestsForm, 'Interesses atualizados com sucesso.', {
        type: 'success',
      });
    }
  }

  window.navigateToClientDetail = (clientId) => {
    if (!clientId) {
      return;
    }
    const client = findClientById(clientId);
    if (!client) {
      return;
    }
    openClientDetail(client);
  };

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
    attachButtonHandler(button, () => handleSortClick(button));
  });

  selectAllCheckbox?.addEventListener('change', handleSelectAllChange);
  clientsTableBody.addEventListener('change', handleRowSelectionChange);
  clientsTableBody.addEventListener('click', handleTableClick);
  paginationButtons.forEach((button) => {
    attachButtonHandler(button, handlePaginationClick);
  });

  clientPurchasesContainer?.addEventListener('click', handlePurchaseToggle);
  clientPurchasesContainer?.addEventListener('scroll', () => {
    state.detail.purchases.scrollTop = clientPurchasesContainer.scrollTop;
  });
  clientContactHistoryContainer?.addEventListener('click', handleContactHistoryClick);
  clientContactHistoryContainer?.addEventListener('scroll', () => {
    state.detail.contacts.scrollTop = clientContactHistoryContainer.scrollTop;
  });
  attachButtonHandler(clientQuickSaleButton, openQuickSaleModal);
  attachButtonHandler(clientQuickSaleCloseButton, closeQuickSaleModal);
  attachButtonHandler(clientQuickSaleCancelButton, closeQuickSaleModal);
  attachButtonHandler(clientQuickSaleSaveButton, handleQuickSaleSaveClick);
  clientQuickSaleOverlay?.addEventListener('click', handleQuickSaleOverlayClick);
  clientQuickSaleForm?.addEventListener('submit', handleQuickSaleSubmit);
  attachButtonHandler(clientsDetailButton, handleDetailButtonClick);
  attachButtonHandler(clientsNewButton, handleNewClientClick);
  attachButtonHandler(clientsAdvancedSearchButton, openAdvancedSearchModal);
  attachButtonHandler(clientsAdvancedCloseButton, closeAdvancedSearchModalInternal);
  attachButtonHandler(clientsAdvancedResetButton, handleAdvancedReset);
  attachButtonHandler(clientsAdvancedApplyButton, () => {
    if (!clientsAdvancedForm) {
      return;
    }
    clientsAdvancedForm.requestSubmit();
  });
  clientsAdvancedOverlay?.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }
    if (!event.target.closest('.modal')) {
      closeAdvancedSearchModalInternal();
    }
  });
  clientsAdvancedForm?.addEventListener('submit', handleAdvancedFormSubmit);
  attachButtonHandler(clientInterestsEditButton, openClientInterestsModal);
  clientInterestsCancelButtons?.forEach((button) => {
    attachButtonHandler(button, () => {
      closeClientInterestsModalInternal();
    });
  });
  clientInterestsOverlay?.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) {
      return;
    }
    if (!event.target.closest('.modal')) {
      closeClientInterestsModalInternal();
    }
  });
  clientInterestsForm?.addEventListener('submit', handleClientInterestsSubmit);
  attachButtonHandler(clientInterestsSaveButton, () => {
    clientInterestsForm?.requestSubmit();
  });
  attachButtonHandler(homeAddClientCardButton, () => {
    prepareClientForm('create');
    setActivePage('cadastro-cliente');
  });
  clientFormElement?.addEventListener('submit', handleClientFormSubmit);
  attachButtonHandler(clientFormCancelButton, handleClientDetailBack);
  attachButtonHandler(clientFormSaveButton, () => {
    clientFormElement?.requestSubmit();
  });
  attachButtonHandler(clientDetailBackButton, handleClientDetailBack);
  attachButtonHandler(clientDetailEditButton, handleClientDetailEdit);
  attachButtonHandler(clientDetailDeleteButton, handleClientDetailDelete);

  document.addEventListener('pagechange', (event) => {
    if (event.detail?.page === 'clientes') {
      loadClientsFromApi();
    }
  });

  if (clientsPageElement?.classList.contains('is-active')) {
    loadClientsFromApi();
  }

  applyColumnWidths();
  initializeColumnResizers();
  updateSortIndicators();
  renderClients();
  ensureDetailButtonState();
  updateAdvancedButtonState();
  updateQuickSaleButtonState(getCurrentClientData());

  window.closeClientsAdvancedSearchModal = closeAdvancedSearchModalInternal;
  window.closeClientInterestsModal = closeClientInterestsModalInternal;
  window.handleContactUpdateResponse = handleContactUpdateResponse;
})();
