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
      updateAdvancedButtonState();
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

      row.appendChild(createNameCell(client));
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

  function renderClientDetail(client) {
    if (!clientDetailFields || !clientPurchasesContainer) {
      return;
    }

    const age = calculateAgeFromBirthDate(client.birthDate);
    const detailMap = {
      name: client.name,
      cpf: client.cpf,
      phone: client.phone,
      gender: client.gender === 'F' ? 'Feminino' : 'Masculino',
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
    clientPurchasesContainer.innerHTML = '';
    if (!client.purchases?.length) {
      const placeholder = document.createElement('div');
      placeholder.className = 'client-card__empty';
      placeholder.textContent = 'Nenhuma compra cadastrada.';
      clientPurchasesContainer.appendChild(placeholder);
      return;
    }

    const latestPurchase = getLatestPurchase(client);

    client.purchases
      .slice()
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .forEach((purchase) => {
        const article = document.createElement('article');
        article.className = 'client-purchase';
        if (purchase === latestPurchase) {
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
    }
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

  function generateClientId() {
    const maxNumber = CLIENTS.reduce((max, client) => {
      const numeric = Number(client.id.replace(/\D/g, ''));
      return Number.isNaN(numeric) ? max : Math.max(max, numeric);
    }, 0);
    return `cli-${String(maxNumber + 1).padStart(3, '0')}`;
  }

  function prepareClientForm(mode = 'create', client = null) {
    if (!clientFormElement) {
      return;
    }
    clientFormElement.reset();
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
      state: client?.state ?? CLIENT_STATE_VALUES[0] ?? 'pos-venda',
      acceptsContact: client?.acceptsContact ?? false,
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
    const state = formData.get('state')?.toString() ?? '';
    const frameMaterial = formData.get('frameMaterial')?.toString().toUpperCase() ?? '';

    return {
      name: formData.get('name')?.toString().trim() ?? '',
      cpf: formData.get('cpf')?.toString().trim() ?? '',
      phone: formData.get('phone')?.toString().trim() ?? '',
      gender: formData.get('gender')?.toString() ?? '',
      userType,
      birthDate: birthDate ? birthDate.toString() : '',
      state,
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

  function handleClientFormSubmit(event) {
    event.preventDefault();
    const data = collectFormData();
    if (!data) {
      return;
    }

    const mode = clientFormElement?.dataset.mode === 'edit' ? 'edit' : 'create';
    const clientId = clientFormElement?.dataset.clientId;
    const birthDateIso = data.birthDate || new Date().toISOString().slice(0, 10);
    const age = calculateAgeFromBirthDate(birthDateIso);

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

    if (mode === 'edit' && clientId) {
      const client = findClientById(clientId);
      if (!client) {
        return;
      }
      client.name = data.name;
      client.cpf = data.cpf;
      client.phone = data.phone;
      client.gender = data.gender;
      client.birthDate = birthDateIso;
      client.acceptsContact = data.acceptsContact;
      client.age = age || client.age;
      client.userType = data.userType || client.userType;
      client.state = data.state || client.state;

      const purchaseId = clientFormElement?.dataset.purchaseId;
      const purchases = Array.isArray(client.purchases) ? client.purchases : [];
      let targetPurchase = null;

      if (purchaseId) {
        targetPurchase = purchases.find((item) => item.id === purchaseId) || null;
      }

      if (!targetPurchase && purchases.length) {
        targetPurchase = getLatestPurchase(client);
      }

      if (targetPurchase) {
        targetPurchase.date = purchasePayload.date;
        targetPurchase.frame = purchasePayload.frame;
        targetPurchase.frameMaterial = purchasePayload.frameMaterial;
        targetPurchase.frameValue = purchasePayload.frameValue;
        targetPurchase.lens = purchasePayload.lens;
        targetPurchase.lensValue = purchasePayload.lensValue;
        targetPurchase.invoice = purchasePayload.invoice;
        targetPurchase.dioptry = {
          oe: { ...purchasePayload.dioptry.oe },
          od: { ...purchasePayload.dioptry.od },
        };
        clientFormElement.dataset.purchaseId = targetPurchase.id;
      } else {
        const generatedId = `${client.id}-purchase-${Date.now()}`;
        const newPurchase = {
          id: purchaseId || generatedId,
          ...purchasePayload,
        };
        purchases.push(newPurchase);
        clientFormElement.dataset.purchaseId = newPurchase.id;
      }

      client.purchases = purchases
        .slice()
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      client.lastPurchase = getLatestPurchase(client)?.date || purchasePayload.date;
      setCurrentClient(client);
      renderClientDetail(client);
    } else {
      const newClientId = generateClientId();
      const purchase = {
        id: `${newClientId}-purchase-${Date.now()}`,
        ...purchasePayload,
      };

      const newClient = {
        id: newClientId,
        name: data.name,
        cpf: data.cpf,
        phone: data.phone,
        gender: data.gender,
        birthDate: birthDateIso,
        acceptsContact: data.acceptsContact,
        age: age || 0,
        userType: data.userType || USER_TYPE_VALUES[0] || 'VS',
        state: data.state || CLIENT_STATE_VALUES[0] || 'pos-venda',
        interests: [],
        purchases: [purchase],
        lastPurchase: data.purchase.date,
      };

      CLIENTS.push(newClient);
      setCurrentClient(newClient);
      renderClientDetail(newClient);
    }

    renderClients();
    ensureDetailButtonState();
    setActivePage('cliente-detalhe');
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

  function handleClientDetailDelete() {
    const client = getCurrentClientData();
    if (!client) {
      return;
    }
    const confirmed = window.confirm(`Deseja realmente excluir ${client.name}?`);
    if (!confirmed) {
      return;
    }
    const index = CLIENTS.findIndex((item) => item.id === client.id);
    if (index >= 0) {
      CLIENTS.splice(index, 1);
    }
    state.selectedIds.delete(client.id);
    setCurrentClient(null);
    ensureDetailButtonState();
    renderClients();
    setActivePage('clientes');
  }

  function openClientDetail(client) {
    setCurrentClient(client);
    ensureDetailButtonState();
    renderClientDetail(client);
    setActivePage('cliente-detalhe');
  }

  function closeAdvancedSearchModalInternal() {
    closeOverlay(clientsAdvancedOverlay);
  }

  function openAdvancedSearchModal() {
    ensureAdvancedSelectOptions();
    ensureInterestCheckboxes(clientsAdvancedInterestsContainer, 'advancedInterests');
    if (!clientsAdvancedOverlay) {
      return;
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
    if (!clientsAdvancedForm) {
      return;
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
    closeAdvancedSearchModalInternal();
  }

  function handleAdvancedReset() {
    if (!clientsAdvancedForm) {
      return;
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
    closeOverlay(clientInterestsOverlay);
  }

  function openClientInterestsModal() {
    const client = getCurrentClientData();
    if (!client) {
      return;
    }
    ensureInterestCheckboxes(clientInterestsOptionsContainer, 'interests');
    setCheckboxSelections(clientInterestsOptionsContainer, client.interests);
    openOverlay(clientInterestsOverlay);
  }

  function handleClientInterestsSubmit(event) {
    event.preventDefault();
    const client = getCurrentClientData();
    if (!client || !clientInterestsForm) {
      closeClientInterestsModalInternal();
      return;
    }
    const formData = new FormData(clientInterestsForm);
    const selected = formData
      .getAll('interests')
      .map((value) => value?.toString().trim())
      .filter((value) => Boolean(value));
    client.interests = selected;
    renderClientInterests(client);
    renderClients();
    updateAdvancedButtonState();
    closeClientInterestsModalInternal();
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
    button.addEventListener('click', () => handleSortClick(button));
  });

  selectAllCheckbox?.addEventListener('change', handleSelectAllChange);
  clientsTableBody.addEventListener('change', handleRowSelectionChange);
  clientsTableBody.addEventListener('click', handleTableClick);
  paginationButtons.forEach((button) => {
    button.addEventListener('click', handlePaginationClick);
  });

  clientPurchasesContainer?.addEventListener('click', handlePurchaseToggle);
  clientsDetailButton?.addEventListener('click', handleDetailButtonClick);
  clientsNewButton?.addEventListener('click', handleNewClientClick);
  clientsAdvancedSearchButton?.addEventListener('click', openAdvancedSearchModal);
  clientsAdvancedCloseButton?.addEventListener('click', () => {
    closeAdvancedSearchModalInternal();
  });
  clientsAdvancedResetButton?.addEventListener('click', handleAdvancedReset);
  clientsAdvancedApplyButton?.addEventListener('click', () => {
    if (!clientsAdvancedForm) {
      return;
    }
    clientsAdvancedForm.requestSubmit();
  });
  clientsAdvancedOverlay?.addEventListener('click', (event) => {
    if (event.target === clientsAdvancedOverlay) {
      closeAdvancedSearchModalInternal();
    }
  });
  clientsAdvancedForm?.addEventListener('submit', handleAdvancedFormSubmit);
  clientInterestsEditButton?.addEventListener('click', openClientInterestsModal);
  clientInterestsCancelButtons?.forEach((button) => {
    button.addEventListener('click', () => {
      closeClientInterestsModalInternal();
    });
  });
  clientInterestsOverlay?.addEventListener('click', (event) => {
    if (event.target === clientInterestsOverlay) {
      closeClientInterestsModalInternal();
    }
  });
  clientInterestsForm?.addEventListener('submit', handleClientInterestsSubmit);
  clientInterestsSaveButton?.addEventListener('click', () => {
    clientInterestsForm?.requestSubmit();
  });
  homeAddClientCardButton?.addEventListener('click', () => {
    prepareClientForm('create');
    setActivePage('cadastro-cliente');
  });
  clientFormElement?.addEventListener('submit', handleClientFormSubmit);
  clientFormCancelButton?.addEventListener('click', handleClientDetailBack);
  clientDetailBackButton?.addEventListener('click', handleClientDetailBack);
  clientDetailEditButton?.addEventListener('click', handleClientDetailEdit);
  clientDetailDeleteButton?.addEventListener('click', handleClientDetailDelete);

  applyColumnWidths();
  initializeColumnResizers();
  updateSortIndicators();
  renderClients();
  ensureDetailButtonState();
  updateAdvancedButtonState();

  window.closeClientsAdvancedSearchModal = closeAdvancedSearchModalInternal;
  window.closeClientInterestsModal = closeClientInterestsModalInternal;
})();
