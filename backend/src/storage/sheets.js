const clientes = [];
const eventos = [];

let nextClienteId = 1;
let nextEventoId = 1;
let nextPurchaseId = 1;

function normalizeCpfKey(value) {
  if (value === undefined || value === null) {
    return null;
  }
  const digits = String(value)
    .trim()
    .replace(/\D/g, '');
  return digits.length > 0 ? digits : null;
}

function assertCpfAvailable(cpfValue, { ignoreId } = {}) {
  const normalized = normalizeCpfKey(cpfValue);
  if (!normalized) {
    return;
  }

  const conflict = clientes.find(
    (client) => client.cpfNormalized === normalized && client.id !== ignoreId
  );
  if (conflict) {
    const error = new Error('Já existe um cliente cadastrado com este CPF.');
    error.code = 'CONFLICT';
    throw error;
  }
}

clientes.forEach((client) => {
  client.cpfNormalized = normalizeCpfKey(client.cpf);
});

function cloneDioptry(dioptry = {}) {
  const oe = dioptry.oe || {};
  const od = dioptry.od || {};
  return {
    oe: {
      spherical: oe.spherical ?? null,
      cylindrical: oe.cylindrical ?? null,
      axis: oe.axis ?? null,
      dnp: oe.dnp ?? null,
      addition: oe.addition ?? null,
    },
    od: {
      spherical: od.spherical ?? null,
      cylindrical: od.cylindrical ?? null,
      axis: od.axis ?? null,
      dnp: od.dnp ?? null,
      addition: od.addition ?? null,
    },
  };
}

function clonePurchase(purchase) {
  return {
    id: purchase.id,
    clientId: purchase.clientId,
    date: purchase.date,
    frame: purchase.frame,
    frameMaterial: purchase.frameMaterial,
    frameValue: purchase.frameValue,
    lens: purchase.lens,
    lensValue: purchase.lensValue,
    invoice: purchase.invoice,
    dioptry: cloneDioptry(purchase.dioptry),
    createdAt: purchase.createdAt,
    updatedAt: purchase.updatedAt,
  };
}

function cloneClient(client) {
  return {
    id: client.id,
    nome: client.nome,
    telefone: client.telefone,
    email: client.email,
    cpf: client.cpf,
    gender: client.gender,
    birthDate: client.birthDate,
    acceptsContact: client.acceptsContact,
    userType: client.userType,
    state: client.state,
    interests: client.interests.slice(),
    purchases: client.purchases.map((purchase) => clonePurchase(purchase)),
    lastPurchase: client.lastPurchase,
    createdAt: client.createdAt,
    updatedAt: client.updatedAt,
  };
}

function sortClientesByIdDesc(records) {
  return records
    .slice()
    .sort((a, b) => b.id - a.id)
    .map((client) => cloneClient(client));
}

function sortEventos(records) {
  return records
    .slice()
    .sort((a, b) => {
      const dataCompare = b.data.localeCompare(a.data);
      if (dataCompare !== 0) {
        return dataCompare;
      }
      return b.id - a.id;
    })
    .map((evento) => ({ ...evento }));
}

function normalizeInterests(interests) {
  if (!Array.isArray(interests)) {
    return [];
  }
  const seen = new Set();
  const normalized = [];
  interests.forEach((item) => {
    if (item === undefined || item === null) {
      return;
    }
    const text = String(item).trim();
    if (!text) {
      return;
    }
    const key = text.toLowerCase();
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    normalized.push(text);
  });
  return normalized;
}

function normalizeEyePayload(eye = {}) {
  const spherical = eye.spherical ?? eye.esferico ?? eye.esférico;
  const cylindrical = eye.cylindrical ?? eye.cilindrico ?? eye.cilíndrico;
  const axis = eye.axis ?? eye.eixo;
  const dnp = eye.dnp;
  const addition = eye.addition ?? eye.adicao ?? eye.adição;
  function normalize(value) {
    if (value === undefined || value === null) {
      return null;
    }
    const text = String(value).trim();
    return text.length === 0 ? null : text;
  }
  return {
    spherical: normalize(spherical),
    cylindrical: normalize(cylindrical),
    axis: normalize(axis),
    dnp: normalize(dnp),
    addition: normalize(addition),
  };
}

function createPurchaseRecord(clientId, payload) {
  if (!payload || !payload.date) {
    return null;
  }
  const timestamp = new Date().toISOString();
  const frameMaterial = payload.frameMaterial
    ? String(payload.frameMaterial).toUpperCase()
    : '';
  const frameValue = Number(payload.frameValue);
  const lensValue = Number(payload.lensValue);

  return {
    id: nextPurchaseId++,
    clientId,
    date: String(payload.date).slice(0, 10),
    frame: payload.frame ?? '',
    frameMaterial,
    frameValue: Number.isNaN(frameValue) ? 0 : frameValue,
    lens: payload.lens ?? '',
    lensValue: Number.isNaN(lensValue) ? 0 : lensValue,
    invoice: payload.invoice ?? '',
    dioptry: {
      oe: normalizeEyePayload(payload.dioptry?.oe),
      od: normalizeEyePayload(payload.dioptry?.od),
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function updatePurchaseRecord(existing, payload) {
  if (!payload) {
    return existing;
  }
  const frameMaterial = payload.frameMaterial
    ? String(payload.frameMaterial).toUpperCase()
    : existing.frameMaterial;
  const frameValue =
    payload.frameValue === undefined || payload.frameValue === null
      ? existing.frameValue
      : Number(payload.frameValue);
  const lensValue =
    payload.lensValue === undefined || payload.lensValue === null
      ? existing.lensValue
      : Number(payload.lensValue);

  existing.date = payload.date ? String(payload.date).slice(0, 10) : existing.date;
  existing.frame = payload.frame ?? existing.frame;
  existing.frameMaterial = frameMaterial;
  existing.frameValue = Number.isNaN(frameValue) ? existing.frameValue : frameValue;
  existing.lens = payload.lens ?? existing.lens;
  existing.lensValue = Number.isNaN(lensValue) ? existing.lensValue : lensValue;
  existing.invoice = payload.invoice ?? existing.invoice;
  if (payload.dioptry || payload.dioptria) {
    const oe = payload.dioptry?.oe ?? payload.dioptria?.oe;
    const od = payload.dioptry?.od ?? payload.dioptria?.od;
    existing.dioptry = {
      oe: normalizeEyePayload(oe),
      od: normalizeEyePayload(od),
    };
  }
  existing.updatedAt = new Date().toISOString();
  return existing;
}

function updateClientPurchases(client, payload) {
  if (payload.purchase) {
    const purchasePayload = payload.purchase;
    if (purchasePayload.id) {
      const purchaseId = Number(purchasePayload.id);
      const existing = client.purchases.find((entry) => entry.id === purchaseId);
      if (existing) {
        updatePurchaseRecord(existing, purchasePayload);
      } else {
        const created = createPurchaseRecord(client.id, purchasePayload);
        if (created) {
          client.purchases.push(created);
        }
      }
    } else {
      const created = createPurchaseRecord(client.id, purchasePayload);
      if (created) {
        client.purchases.push(created);
      }
    }
  }

  if (Array.isArray(payload.purchases)) {
    payload.purchases.forEach((purchasePayload) => {
      if (!purchasePayload) {
        return;
      }
      if (purchasePayload.id) {
        const purchaseId = Number(purchasePayload.id);
        const existing = client.purchases.find((entry) => entry.id === purchaseId);
        if (existing) {
          updatePurchaseRecord(existing, purchasePayload);
          return;
        }
      }
      const created = createPurchaseRecord(client.id, purchasePayload);
      if (created) {
        client.purchases.push(created);
      }
    });
  }

  client.purchases.sort((a, b) => new Date(a.date) - new Date(b.date));
  const last = client.purchases[client.purchases.length - 1];
  client.lastPurchase = last ? last.date : null;
}

function listClientes() {
  return sortClientesByIdDesc(clientes);
}

function createCliente(payload) {
  if (!payload?.nome) {
    throw new Error('Campo "nome" é obrigatório.');
  }

  assertCpfAvailable(payload.cpf);

  const timestamp = new Date().toISOString();
  const cpfNormalized = normalizeCpfKey(payload.cpf);
  const client = {
    id: nextClienteId++,
    nome: String(payload.nome).trim(),
    telefone: payload.telefone ?? null,
    email: payload.email ?? null,
    cpf: payload.cpf ?? null,
    cpfNormalized,
    gender: payload.gender ? String(payload.gender).toUpperCase() : null,
    birthDate: payload.birthDate ?? null,
    acceptsContact: Boolean(payload.acceptsContact),
    userType: payload.userType ? String(payload.userType).toUpperCase() : null,
    state: payload.state ? String(payload.state).toLowerCase() : null,
    interests: normalizeInterests(payload.interests),
    purchases: [],
    lastPurchase: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  updateClientPurchases(client, payload);
  clientes.push(client);
  return cloneClient(client);
}

function updateCliente(id, payload) {
  const clienteId = Number(id);
  if (Number.isNaN(clienteId)) {
    return null;
  }

  const client = clientes.find((entry) => entry.id === clienteId);
  if (!client) {
    return null;
  }

  if (payload.nome !== undefined) {
    client.nome = String(payload.nome).trim();
  }
  if (payload.telefone !== undefined) {
    client.telefone = payload.telefone ?? null;
  }
  if (payload.email !== undefined) {
    client.email = payload.email ?? null;
  }
  if (payload.cpf !== undefined) {
    assertCpfAvailable(payload.cpf, { ignoreId: client.id });
    client.cpf = payload.cpf ?? null;
    client.cpfNormalized = normalizeCpfKey(payload.cpf);
  }
  if (payload.gender !== undefined) {
    client.gender = payload.gender ? String(payload.gender).toUpperCase() : null;
  }
  if (payload.birthDate !== undefined) {
    client.birthDate = payload.birthDate ?? null;
  }
  if (payload.acceptsContact !== undefined) {
    client.acceptsContact = Boolean(payload.acceptsContact);
  }
  if (payload.userType !== undefined) {
    client.userType = payload.userType ? String(payload.userType).toUpperCase() : null;
  }
  if (payload.state !== undefined) {
    client.state = payload.state ? String(payload.state).toLowerCase() : null;
  }
  if (payload.interests !== undefined) {
    client.interests = normalizeInterests(payload.interests);
  }

  updateClientPurchases(client, payload);
  if (client.cpfNormalized === undefined) {
    client.cpfNormalized = normalizeCpfKey(client.cpf);
  }
  client.updatedAt = new Date().toISOString();
  return cloneClient(client);
}

function deleteCliente(id) {
  const clienteId = Number(id);
  if (Number.isNaN(clienteId)) {
    return false;
  }

  const index = clientes.findIndex((entry) => entry.id === clienteId);
  if (index === -1) {
    return false;
  }

  clientes.splice(index, 1);
  return true;
}

function listEventos() {
  return sortEventos(eventos);
}

function createEvento({
  data,
  titulo,
  descricao = null,
  cor = null,
  cliente_id = null,
}) {
  if (!data || !titulo) {
    throw new Error('Campos "data" e "titulo" são obrigatórios.');
  }

  const timestamp = new Date().toISOString();
  const evento = {
    id: nextEventoId++,
    data,
    titulo,
    descricao,
    cor,
    cliente_id,
    created_at: timestamp,
    updated_at: timestamp,
  };

  eventos.push(evento);
  return { ...evento };
}

function updateEvento(id, { data, titulo, descricao, cor, cliente_id }) {
  const eventoId = Number(id);
  if (Number.isNaN(eventoId)) {
    return null;
  }

  const evento = eventos.find((entry) => entry.id === eventoId);
  if (!evento) {
    return null;
  }

  evento.data = data ?? evento.data;
  evento.titulo = titulo ?? evento.titulo;
  evento.descricao = descricao ?? evento.descricao;
  evento.cor = cor ?? evento.cor;
  evento.cliente_id = cliente_id === undefined ? evento.cliente_id : cliente_id;
  evento.updated_at = new Date().toISOString();

  return { ...evento };
}

function deleteEvento(id) {
  const eventoId = Number(id);
  if (Number.isNaN(eventoId)) {
    return false;
  }

  const index = eventos.findIndex((entry) => entry.id === eventoId);
  if (index === -1) {
    return false;
  }

  eventos.splice(index, 1);
  return true;
}

module.exports = {
  listClientes,
  createCliente,
  updateCliente,
  deleteCliente,
  listEventos,
  createEvento,
  updateEvento,
  deleteEvento,
};
