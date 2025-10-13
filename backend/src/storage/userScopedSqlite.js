const ALLOWED_USER_IDS = new Set(['usuario-teste', 'administrador']);

const CITY_NAMES = [
  'São Paulo',
  'Rio de Janeiro',
  'Belo Horizonte',
  'Curitiba',
  'Porto Alegre',
  'Florianópolis',
  'Salvador',
  'Fortaleza',
  'Recife',
  'Natal',
  'João Pessoa',
  'Maceió',
  'Aracaju',
  'Manaus',
  'Belém',
  'São Luís',
  'Teresina',
  'Palmas',
  'Campo Grande',
  'Cuiabá',
  'Goiânia',
  'Brasília',
  'Vitória',
  'Uberlândia',
  'Campinas',
  'Ribeirão Preto',
  'Sorocaba',
  'Juiz de Fora',
  'Londrina',
  'Joinville',
];

const USER_TYPE_SEQUENCE = ['MF', 'VS', 'BF'];
const FRAME_MATERIALS = ['METAL', 'ACETATO', 'TITANIUM', 'OUTROS'];
const INTEREST_OPTIONS = ['Solar', 'Multifocal', 'Bifocal', 'Visão Simples'];

function normalizeUserId(value) {
  if (value === undefined || value === null) {
    return null;
  }

  const text = String(value).trim();
  if (!text) {
    return null;
  }

  return text
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');
}

function ensureAllowedUserId(value) {
  const normalized = normalizeUserId(value);
  if (!normalized || !ALLOWED_USER_IDS.has(normalized)) {
    const error = new Error('Usuário inválido.');
    error.code = 'INVALID_USER';
    throw error;
  }
  return normalized;
}

function matchesUserId(candidate, target) {
  return normalizeUserId(candidate) === target;
}

function buildEmail(citySlug, index) {
  return `${citySlug}.${String(index + 1).padStart(2, '0')}@example.com`;
}

function buildPhone(index) {
  const areaCode = 11 + (index % 19);
  const base = 900000000 + index * 137;
  const number = String(base).slice(-8);
  return `+55 ${areaCode} ${number.slice(0, 4)}-${number.slice(4)}`;
}

function toSlug(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function randomizeInterests(index) {
  const count = (index % INTEREST_OPTIONS.length) + 1;
  const start = index % INTEREST_OPTIONS.length;
  return Array.from({ length: count }, (_, offset) => {
    const interestIndex = (start + offset) % INTEREST_OPTIONS.length;
    return INTEREST_OPTIONS[interestIndex];
  });
}

function buildPurchase(city, clientIndex, purchaseIndex) {
  const baseDate = new Date(Date.UTC(2021, 0, 15));
  const monthOffset = clientIndex * 2 + purchaseIndex;
  baseDate.setUTCMonth(baseDate.getUTCMonth() + monthOffset);
  const isoDate = baseDate.toISOString().slice(0, 10);

  const frameMaterial = FRAME_MATERIALS[(clientIndex + purchaseIndex) % FRAME_MATERIALS.length];
  const frameValue = 520 + clientIndex * 15 + purchaseIndex * 25;
  const lensValue = 340 + clientIndex * 12 + purchaseIndex * 18;
  const dioptryBase = ((clientIndex + purchaseIndex) % 5) + 1;

  return {
    date: isoDate,
    frame: `Armação ${city} ${purchaseIndex + 1}`,
    frameMaterial,
    frameValue,
    lens: `Lente Série ${((clientIndex + purchaseIndex) % 4) + 1}`,
    lensValue,
    invoice: `NF-${String(clientIndex + 1).padStart(2, '0')}-${purchaseIndex + 1}`,
    detail: `Venda realizada em ${city}.`,
    dioptry: {
      oe: {
        spherical: `-${(dioptryBase * 0.25).toFixed(2)}`,
        cylindrical: `-${(dioptryBase * 0.2).toFixed(2)}`,
        axis: String(45 + dioptryBase * 5),
        dnp: String(29 + dioptryBase),
        addition: (1 + dioptryBase * 0.25).toFixed(2),
      },
      od: {
        spherical: `-${(dioptryBase * 0.25 - 0.25).toFixed(2)}`,
        cylindrical: `-${(dioptryBase * 0.2 - 0.15).toFixed(2)}`,
        axis: String(80 + dioptryBase * 4),
        dnp: String(30 + dioptryBase),
        addition: (1 + dioptryBase * 0.3).toFixed(2),
      },
    },
  };
}

function buildClientPayload(city, index) {
  const slug = toSlug(city) || `cidade-${index + 1}`;
  const purchaseCount = (index % 4) + 1;
  const purchases = Array.from({ length: purchaseCount }, (_, purchaseIndex) =>
    buildPurchase(city, index, purchaseIndex)
  );

  const birthYear = 1975 + (index % 20);
  const birthMonth = (index * 3) % 12;
  const birthDay = ((index * 7) % 27) + 1;
  const birthDate = new Date(Date.UTC(birthYear, birthMonth, birthDay)).toISOString().slice(0, 10);

  return {
    nome: city,
    telefone: buildPhone(index),
    email: buildEmail(slug, index),
    gender: index % 2 === 0 ? 'F' : 'M',
    birthDate,
    acceptsContact: index % 3 !== 0,
    userType: USER_TYPE_SEQUENCE[index % USER_TYPE_SEQUENCE.length],
    interests: randomizeInterests(index),
    purchases,
  };
}

function prepareInitialData(base) {
  const allClients = base.listClientes();
  const allEvents = base.listEventos();

  allClients.forEach((client) => {
    const normalizedUserId = normalizeUserId(client.userId);
    if (!ALLOWED_USER_IDS.has(normalizedUserId)) {
      base.deleteCliente(client.id);
    }
  });

  allEvents.forEach((event) => {
    const normalizedUserId = normalizeUserId(event.usuario_id ?? event.userId ?? event.user_id);
    if (!ALLOWED_USER_IDS.has(normalizedUserId)) {
      base.deleteEvento(event.id);
    }
  });

  const refreshedClients = base.listClientes();
  refreshedClients
    .filter((client) => matchesUserId(client.userId, 'administrador'))
    .forEach((client) => base.deleteCliente(client.id));

  base
    .listEventos()
    .filter((event) => matchesUserId(event.usuario_id ?? event.userId ?? event.user_id, 'administrador'))
    .forEach((event) => base.deleteEvento(event.id));

  seedUsuarioTeste(base);
}

function seedUsuarioTeste(base) {
  const userId = 'usuario-teste';
  const existing = base
    .listClientes()
    .filter((client) => matchesUserId(client.userId, userId));

  if (existing.length === CITY_NAMES.length) {
    return;
  }

  existing.forEach((client) => base.deleteCliente(client.id));

  base
    .listEventos()
    .filter((event) => matchesUserId(event.usuario_id ?? event.userId ?? event.user_id, userId))
    .forEach((event) => base.deleteEvento(event.id));

  CITY_NAMES.forEach((city, index) => {
    const payload = buildClientPayload(city, index);
    base.createCliente({ ...payload, userId });
  });
}

module.exports = function createUserScopedAdapter(base) {
  if (!base || typeof base !== 'object') {
    throw new Error('Adaptador de storage inválido.');
  }

  prepareInitialData(base);

  function listClientes(userId) {
    const normalizedUserId = ensureAllowedUserId(userId);
    const clients = base.listClientes();
    return clients.filter((client) => matchesUserId(client.userId, normalizedUserId));
  }

  function createCliente(userId, payload) {
    const normalizedUserId = ensureAllowedUserId(userId);
    const input = { ...payload, userId: normalizedUserId };
    return base.createCliente(input);
  }

  function updateCliente(userId, id, payload) {
    const normalizedUserId = ensureAllowedUserId(userId);
    const numericId = Number(id);
    if (Number.isNaN(numericId)) {
      return null;
    }

    const existing = base
      .listClientes()
      .find((client) => client.id === numericId && matchesUserId(client.userId, normalizedUserId));

    if (!existing) {
      return null;
    }

    const input = { ...payload, userId: normalizedUserId };
    return base.updateCliente(numericId, input);
  }

  function deleteCliente(userId, id) {
    const normalizedUserId = ensureAllowedUserId(userId);
    const numericId = Number(id);
    if (Number.isNaN(numericId)) {
      return false;
    }

    const existing = base
      .listClientes()
      .find((client) => client.id === numericId && matchesUserId(client.userId, normalizedUserId));

    if (!existing) {
      return false;
    }

    return base.deleteCliente(numericId);
  }

  function listEventos(userId) {
    const normalizedUserId = ensureAllowedUserId(userId);
    const eventos = base.listEventos();
    return eventos.filter((evento) =>
      matchesUserId(evento.usuario_id ?? evento.userId ?? evento.user_id, normalizedUserId)
    );
  }

  function createEvento(userId, payload) {
    const normalizedUserId = ensureAllowedUserId(userId);
    let clientId = payload?.cliente_id ?? payload?.clientId ?? null;
    if (clientId !== null && clientId !== undefined) {
      const numericClientId = Number(clientId);
      const clientExists = base
        .listClientes()
        .some(
          (client) =>
            client.id === numericClientId && matchesUserId(client.userId, normalizedUserId)
        );
      if (!clientExists) {
        clientId = null;
      } else {
        clientId = numericClientId;
      }
    } else {
      clientId = null;
    }

    const input = {
      ...payload,
      cliente_id: clientId,
      usuario_id: normalizedUserId,
      user_id: normalizedUserId,
      userId: normalizedUserId,
    };

    return base.createEvento(input);
  }

  function updateEvento(userId, id, payload) {
    const normalizedUserId = ensureAllowedUserId(userId);
    const numericId = Number(id);
    if (Number.isNaN(numericId)) {
      return null;
    }

    const existing = base
      .listEventos()
      .find((evento) => matchesUserId(evento.usuario_id ?? evento.userId ?? evento.user_id, normalizedUserId)
        && evento.id === numericId);

    if (!existing) {
      return null;
    }

    let clientId = payload?.cliente_id ?? payload?.clientId ?? existing.cliente_id ?? null;
    if (clientId !== null && clientId !== undefined) {
      const numericClientId = Number(clientId);
      const clientExists = base
        .listClientes()
        .some(
          (client) =>
            client.id === numericClientId && matchesUserId(client.userId, normalizedUserId)
        );
      clientId = clientExists ? numericClientId : null;
    } else {
      clientId = null;
    }

    const input = {
      ...payload,
      cliente_id: clientId,
      usuario_id: normalizedUserId,
      user_id: normalizedUserId,
      userId: normalizedUserId,
    };

    return base.updateEvento(numericId, input);
  }

  function deleteEvento(userId, id) {
    const normalizedUserId = ensureAllowedUserId(userId);
    const numericId = Number(id);
    if (Number.isNaN(numericId)) {
      return false;
    }

    const existing = base
      .listEventos()
      .find((evento) => matchesUserId(evento.usuario_id ?? evento.userId ?? evento.user_id, normalizedUserId)
        && evento.id === numericId);

    if (!existing) {
      return false;
    }

    return base.deleteEvento(numericId);
  }

  function listContacts(userId) {
    const normalizedUserId = ensureAllowedUserId(userId);
    const clients = base
      .listClientes()
      .filter((client) => matchesUserId(client.userId, normalizedUserId));
    const allowedClientIds = new Set(clients.map((client) => client.id));

    return base
      .listContacts()
      .filter((contact) => allowedClientIds.has(contact.clientId));
  }

  function updateContactStatus(userId, contactId, completed) {
    const normalizedUserId = ensureAllowedUserId(userId);
    const numericId = Number(contactId);
    if (Number.isNaN(numericId)) {
      return null;
    }

    const contact = base
      .listContacts()
      .find((item) => item.id === numericId);

    if (!contact) {
      return null;
    }

    const client = base
      .listClientes()
      .find((item) => item.id === contact.clientId && matchesUserId(item.userId, normalizedUserId));

    if (!client) {
      return null;
    }

    return base.updateContactStatus(numericId, completed);
  }

  return {
    listClientes,
    createCliente,
    updateCliente,
    deleteCliente,
    listEventos,
    createEvento,
    updateEvento,
    deleteEvento,
    listContacts,
    updateContactStatus,
  };
};
