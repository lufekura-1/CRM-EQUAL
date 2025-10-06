const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { SQLITE_DB_PATH } = require('../config/env');

const databasePath = SQLITE_DB_PATH;
const databaseDir = path.dirname(databasePath);

if (!fs.existsSync(databaseDir)) {
  fs.mkdirSync(databaseDir, { recursive: true });
}

const db = new Database(databasePath);

db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    telefone TEXT,
    email TEXT,
    created_at TEXT
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS eventos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data TEXT NOT NULL,
    titulo TEXT NOT NULL,
    descricao TEXT,
    cor TEXT,
    cliente_id INTEGER,
    created_at TEXT
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS compras (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL,
    data TEXT NOT NULL,
    armacao TEXT,
    material_armacao TEXT,
    valor_armacao REAL,
    lente TEXT,
    valor_lente REAL,
    nota_fiscal TEXT,
    oe_esferico TEXT,
    oe_cilindrico TEXT,
    oe_eixo TEXT,
    oe_dnp TEXT,
    oe_adicao TEXT,
    od_esferico TEXT,
    od_cilindrico TEXT,
    od_eixo TEXT,
    od_dnp TEXT,
    od_adicao TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
  );
`);

function ensureColumn(table, column, definition) {
  const info = db.pragma(`table_info(${table})`);
  const hasColumn = info.some((entry) => entry.name === column);
  if (!hasColumn) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

ensureColumn('clientes', 'cpf', 'TEXT');
ensureColumn('clientes', 'genero', 'TEXT');
ensureColumn('clientes', 'data_nascimento', 'TEXT');
ensureColumn('clientes', 'aceita_contato', 'INTEGER DEFAULT 0');
ensureColumn('clientes', 'tipo_usuario', 'TEXT');
ensureColumn('clientes', 'estado_cliente', 'TEXT');
ensureColumn('clientes', 'interesses', 'TEXT');
ensureColumn('clientes', 'updated_at', 'TEXT');

ensureColumn('eventos', 'updated_at', 'TEXT');
ensureColumn('eventos', 'cliente_id', 'INTEGER');

const purchaseColumns = [
  ['armacao', 'TEXT'],
  ['material_armacao', 'TEXT'],
  ['valor_armacao', 'REAL'],
  ['lente', 'TEXT'],
  ['valor_lente', 'REAL'],
  ['nota_fiscal', 'TEXT'],
  ['oe_esferico', 'TEXT'],
  ['oe_cilindrico', 'TEXT'],
  ['oe_eixo', 'TEXT'],
  ['oe_dnp', 'TEXT'],
  ['oe_adicao', 'TEXT'],
  ['od_esferico', 'TEXT'],
  ['od_cilindrico', 'TEXT'],
  ['od_eixo', 'TEXT'],
  ['od_dnp', 'TEXT'],
  ['od_adicao', 'TEXT'],
  ['created_at', 'TEXT'],
  ['updated_at', 'TEXT'],
];

purchaseColumns.forEach(([column, definition]) => {
  ensureColumn('compras', column, definition);
});

const listClientesStmt = db.prepare(`
  SELECT
    id,
    nome,
    telefone,
    email,
    cpf,
    genero,
    data_nascimento,
    aceita_contato,
    tipo_usuario,
    estado_cliente,
    interesses,
    created_at,
    updated_at
  FROM clientes
  ORDER BY id DESC
`);

const listPurchasesStmt = db.prepare(`
  SELECT
    id,
    cliente_id,
    data,
    armacao,
    material_armacao,
    valor_armacao,
    lente,
    valor_lente,
    nota_fiscal,
    oe_esferico,
    oe_cilindrico,
    oe_eixo,
    oe_dnp,
    oe_adicao,
    od_esferico,
    od_cilindrico,
    od_eixo,
    od_dnp,
    od_adicao,
    created_at,
    updated_at
  FROM compras
  ORDER BY data ASC, id ASC
`);

const listPurchasesByClienteStmt = db.prepare(`
  SELECT
    id,
    cliente_id,
    data,
    armacao,
    material_armacao,
    valor_armacao,
    lente,
    valor_lente,
    nota_fiscal,
    oe_esferico,
    oe_cilindrico,
    oe_eixo,
    oe_dnp,
    oe_adicao,
    od_esferico,
    od_cilindrico,
    od_eixo,
    od_dnp,
    od_adicao,
    created_at,
    updated_at
  FROM compras
  WHERE cliente_id = ?
  ORDER BY data ASC, id ASC
`);

const getClienteStmt = db.prepare(`
  SELECT
    id,
    nome,
    telefone,
    email,
    cpf,
    genero,
    data_nascimento,
    aceita_contato,
    tipo_usuario,
    estado_cliente,
    interesses,
    created_at,
    updated_at
  FROM clientes
  WHERE id = ?
`);

const insertClienteStmt = db.prepare(`
  INSERT INTO clientes (
    nome,
    telefone,
    email,
    cpf,
    genero,
    data_nascimento,
    aceita_contato,
    tipo_usuario,
    estado_cliente,
    interesses,
    created_at,
    updated_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const updateClienteStmt = db.prepare(`
  UPDATE clientes
  SET
    nome = ?,
    telefone = ?,
    email = ?,
    cpf = ?,
    genero = ?,
    data_nascimento = ?,
    aceita_contato = ?,
    tipo_usuario = ?,
    estado_cliente = ?,
    interesses = ?,
    updated_at = ?
  WHERE id = ?
`);

const deleteClienteStmt = db.prepare('DELETE FROM clientes WHERE id = ?');

const getPurchaseStmt = db.prepare(`
  SELECT
    id,
    cliente_id,
    data,
    armacao,
    material_armacao,
    valor_armacao,
    lente,
    valor_lente,
    nota_fiscal,
    oe_esferico,
    oe_cilindrico,
    oe_eixo,
    oe_dnp,
    oe_adicao,
    od_esferico,
    od_cilindrico,
    od_eixo,
    od_dnp,
    od_adicao,
    created_at,
    updated_at
  FROM compras
  WHERE id = ?
`);

const insertPurchaseStmt = db.prepare(`
  INSERT INTO compras (
    cliente_id,
    data,
    armacao,
    material_armacao,
    valor_armacao,
    lente,
    valor_lente,
    nota_fiscal,
    oe_esferico,
    oe_cilindrico,
    oe_eixo,
    oe_dnp,
    oe_adicao,
    od_esferico,
    od_cilindrico,
    od_eixo,
    od_dnp,
    od_adicao,
    created_at,
    updated_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const updatePurchaseStmt = db.prepare(`
  UPDATE compras
  SET
    data = ?,
    armacao = ?,
    material_armacao = ?,
    valor_armacao = ?,
    lente = ?,
    valor_lente = ?,
    nota_fiscal = ?,
    oe_esferico = ?,
    oe_cilindrico = ?,
    oe_eixo = ?,
    oe_dnp = ?,
    oe_adicao = ?,
    od_esferico = ?,
    od_cilindrico = ?,
    od_eixo = ?,
    od_dnp = ?,
    od_adicao = ?,
    updated_at = ?
  WHERE id = ?
`);

const listEventosStmt = db.prepare(`
  SELECT id, data, titulo, descricao, cor, cliente_id, created_at, updated_at
  FROM eventos
  ORDER BY data DESC, id DESC
`);

const getEventoStmt = db.prepare(`
  SELECT id, data, titulo, descricao, cor, cliente_id, created_at, updated_at
  FROM eventos
  WHERE id = ?
`);

const insertEventoStmt = db.prepare(`
  INSERT INTO eventos (data, titulo, descricao, cor, cliente_id, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const updateEventoStmt = db.prepare(`
  UPDATE eventos
  SET data = ?, titulo = ?, descricao = ?, cor = ?, cliente_id = ?, updated_at = ?
  WHERE id = ?
`);

const deleteEventoStmt = db.prepare('DELETE FROM eventos WHERE id = ?');

function toNullableText(value) {
  if (value === undefined || value === null) {
    return null;
  }
  const stringValue = String(value).trim();
  return stringValue.length === 0 ? null : stringValue;
}

function toNumberOrNull(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const numberValue = Number(value);
  if (Number.isNaN(numberValue)) {
    return null;
  }
  return numberValue;
}

function normalizeBirthDate(value) {
  const text = toNullableText(value);
  if (!text) {
    return null;
  }
  const normalized = text.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null;
}

function normalizeGender(value) {
  const text = toNullableText(value);
  return text ? text.toUpperCase() : null;
}

function normalizeUserType(value) {
  const text = toNullableText(value);
  return text ? text.toUpperCase() : null;
}

function normalizeClientState(value) {
  const text = toNullableText(value);
  return text ? text.toLowerCase() : null;
}

function parseInterests(rawValue) {
  if (!rawValue) {
    return [];
  }
  try {
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((item) => {
        if (item === null || item === undefined) {
          return '';
        }
        return String(item).trim();
      })
      .filter((item) => item.length > 0);
  } catch (error) {
    return [];
  }
}

function normalizeInterestsInput(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  const seen = new Set();
  const normalized = [];
  value.forEach((item) => {
    if (item === null || item === undefined) {
      return;
    }
    const trimmed = String(item).trim();
    if (!trimmed) {
      return;
    }
    const lower = trimmed.toLowerCase();
    if (seen.has(lower)) {
      return;
    }
    seen.add(lower);
    normalized.push(trimmed);
  });
  return normalized;
}

function mapClienteRow(row) {
  return {
    id: row.id,
    nome: row.nome,
    telefone: row.telefone ?? null,
    email: row.email ?? null,
    cpf: row.cpf ?? null,
    gender: row.genero ?? null,
    birthDate: row.data_nascimento ?? null,
    acceptsContact: Boolean(row.aceita_contato),
    userType: row.tipo_usuario ?? null,
    state: row.estado_cliente ?? null,
    interests: parseInterests(row.interesses),
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

function mapPurchaseRow(row) {
  return {
    id: row.id,
    clientId: row.cliente_id,
    date: row.data,
    frame: row.armacao ?? '',
    frameMaterial: row.material_armacao ?? '',
    frameValue:
      row.valor_armacao === null || row.valor_armacao === undefined
        ? null
        : Number(row.valor_armacao),
    lens: row.lente ?? '',
    lensValue:
      row.valor_lente === null || row.valor_lente === undefined
        ? null
        : Number(row.valor_lente),
    invoice: row.nota_fiscal ?? '',
    dioptry: {
      oe: {
        spherical: row.oe_esferico ?? null,
        cylindrical: row.oe_cilindrico ?? null,
        axis: row.oe_eixo ?? null,
        dnp: row.oe_dnp ?? null,
        addition: row.oe_adicao ?? null,
      },
      od: {
        spherical: row.od_esferico ?? null,
        cylindrical: row.od_cilindrico ?? null,
        axis: row.od_eixo ?? null,
        dnp: row.od_dnp ?? null,
        addition: row.od_adicao ?? null,
      },
    },
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
  };
}

function groupPurchasesByClient(rows) {
  const grouped = new Map();
  rows.forEach((row) => {
    const purchase = mapPurchaseRow(row);
    const key = row.cliente_id;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(purchase);
  });
  return grouped;
}

function normalizeEye(eye) {
  return {
    spherical: toNullableText(eye?.spherical),
    cylindrical: toNullableText(eye?.cylindrical),
    axis: toNullableText(eye?.axis),
    dnp: toNullableText(eye?.dnp),
    addition: toNullableText(eye?.addition),
  };
}

function normalizePurchaseInput(purchase) {
  if (!purchase || !purchase.date) {
    return null;
  }

  const date = String(purchase.date).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return null;
  }

  return {
    id: purchase.id ?? null,
    date,
    frame: toNullableText(purchase.frame),
    frameMaterial: toNullableText(purchase.frameMaterial)?.toUpperCase() ?? null,
    frameValue: toNumberOrNull(purchase.frameValue),
    lens: toNullableText(purchase.lens),
    lensValue: toNumberOrNull(purchase.lensValue),
    invoice: toNullableText(purchase.invoice),
    dioptry: {
      oe: normalizeEye(purchase.dioptry?.oe || {}),
      od: normalizeEye(purchase.dioptry?.od || {}),
    },
  };
}

function insertPurchaseRecord(clienteId, purchase, timestamp) {
  insertPurchaseStmt.run(
    clienteId,
    purchase.date,
    purchase.frame,
    purchase.frameMaterial,
    purchase.frameValue,
    purchase.lens,
    purchase.lensValue,
    purchase.invoice,
    purchase.dioptry.oe.spherical,
    purchase.dioptry.oe.cylindrical,
    purchase.dioptry.oe.axis,
    purchase.dioptry.oe.dnp,
    purchase.dioptry.oe.addition,
    purchase.dioptry.od.spherical,
    purchase.dioptry.od.cylindrical,
    purchase.dioptry.od.axis,
    purchase.dioptry.od.dnp,
    purchase.dioptry.od.addition,
    timestamp,
    timestamp
  );
}

function updatePurchaseRecord(purchaseId, purchase, timestamp) {
  updatePurchaseStmt.run(
    purchase.date,
    purchase.frame,
    purchase.frameMaterial,
    purchase.frameValue,
    purchase.lens,
    purchase.lensValue,
    purchase.invoice,
    purchase.dioptry.oe.spherical,
    purchase.dioptry.oe.cylindrical,
    purchase.dioptry.oe.axis,
    purchase.dioptry.oe.dnp,
    purchase.dioptry.oe.addition,
    purchase.dioptry.od.spherical,
    purchase.dioptry.od.cylindrical,
    purchase.dioptry.od.axis,
    purchase.dioptry.od.dnp,
    purchase.dioptry.od.addition,
    timestamp,
    purchaseId
  );
}

function getClienteWithPurchases(clienteId) {
  const row = getClienteStmt.get(clienteId);
  if (!row) {
    return null;
  }
  const cliente = mapClienteRow(row);
  const purchases = listPurchasesByClienteStmt.all(clienteId).map(mapPurchaseRow);
  cliente.purchases = purchases;
  cliente.lastPurchase = purchases.length ? purchases[purchases.length - 1].date : null;
  return cliente;
}

function listClientes() {
  const rows = listClientesStmt.all();
  if (rows.length === 0) {
    return [];
  }
  const purchases = listPurchasesStmt.all();
  const groupedPurchases = groupPurchasesByClient(purchases);
  return rows.map((row) => {
    const cliente = mapClienteRow(row);
    const clientPurchases = groupedPurchases.get(cliente.id) || [];
    cliente.purchases = clientPurchases;
    cliente.lastPurchase = clientPurchases.length
      ? clientPurchases[clientPurchases.length - 1].date
      : null;
    return cliente;
  });
}

const createClienteTransaction = db.transaction((payload) => {
  if (!payload?.nome) {
    throw new Error('Campo "nome" é obrigatório.');
  }

  const now = new Date().toISOString();
  const interests = normalizeInterestsInput(payload.interests);
  const nome = String(payload.nome).trim();
  if (nome.length === 0) {
    throw new Error('Campo "nome" é obrigatório.');
  }
  const telefone = toNullableText(payload.telefone);
  const email = toNullableText(payload.email);
  const cpf = toNullableText(payload.cpf);
  const gender = normalizeGender(payload.gender);
  const birthDate = normalizeBirthDate(payload.birthDate);
  const userType = normalizeUserType(payload.userType);
  const state = normalizeClientState(payload.state);
  const acceptsContact = Boolean(payload.acceptsContact);

  const result = insertClienteStmt.run(
    nome,
    telefone,
    email,
    cpf,
    gender,
    birthDate,
    acceptsContact ? 1 : 0,
    userType,
    state,
    JSON.stringify(interests),
    now,
    now
  );

  const clienteId = result.lastInsertRowid;

  const purchasesInput = [];
  if (payload.purchase) {
    const normalized = normalizePurchaseInput(payload.purchase);
    if (normalized) {
      purchasesInput.push(normalized);
    }
  }
  if (Array.isArray(payload.purchases)) {
    payload.purchases.forEach((purchase) => {
      const normalized = normalizePurchaseInput(purchase);
      if (normalized) {
        purchasesInput.push(normalized);
      }
    });
  }

  purchasesInput.forEach((purchase) => {
    insertPurchaseRecord(clienteId, purchase, now);
  });

  return getClienteWithPurchases(clienteId);
});

function createCliente(payload) {
  return createClienteTransaction(payload);
}

const updateClienteTransaction = db.transaction((id, payload) => {
  const clienteId = Number(id);
  if (Number.isNaN(clienteId)) {
    return null;
  }

  const existing = getClienteStmt.get(clienteId);
  if (!existing) {
    return null;
  }

  const now = new Date().toISOString();
  const current = mapClienteRow(existing);

  const interests =
    payload.interests === undefined
      ? current.interests
      : normalizeInterestsInput(payload.interests);

  const updatedFields = {
    nome:
      payload.nome === undefined ? current.nome : String(payload.nome).trim(),
    telefone:
      payload.telefone === undefined ? current.telefone : toNullableText(payload.telefone),
    email:
      payload.email === undefined ? current.email : toNullableText(payload.email),
    cpf: payload.cpf === undefined ? current.cpf : toNullableText(payload.cpf),
    gender:
      payload.gender === undefined ? current.gender : normalizeGender(payload.gender),
    birthDate:
      payload.birthDate === undefined
        ? current.birthDate
        : normalizeBirthDate(payload.birthDate),
    acceptsContact:
      payload.acceptsContact === undefined
        ? current.acceptsContact
        : Boolean(payload.acceptsContact),
    userType:
      payload.userType === undefined
        ? current.userType
        : normalizeUserType(payload.userType),
    state:
      payload.state === undefined ? current.state : normalizeClientState(payload.state),
  };

  const normalizedName = String(updatedFields.nome).trim();

  updateClienteStmt.run(
    normalizedName,
    toNullableText(updatedFields.telefone),
    toNullableText(updatedFields.email),
    toNullableText(updatedFields.cpf),
    toNullableText(updatedFields.gender),
    toNullableText(updatedFields.birthDate),
    updatedFields.acceptsContact ? 1 : 0,
    toNullableText(updatedFields.userType),
    toNullableText(updatedFields.state),
    JSON.stringify(interests),
    now,
    clienteId
  );

  const purchaseInputs = [];
  if (payload.purchase) {
    const normalized = normalizePurchaseInput(payload.purchase);
    if (normalized) {
      purchaseInputs.push(normalized);
    }
  }
  if (Array.isArray(payload.purchases)) {
    payload.purchases.forEach((purchase) => {
      const normalized = normalizePurchaseInput(purchase);
      if (normalized) {
        purchaseInputs.push(normalized);
      }
    });
  }

  purchaseInputs.forEach((purchase) => {
    if (purchase.id) {
      const purchaseId = Number(purchase.id);
      if (!Number.isNaN(purchaseId)) {
        const existingPurchase = getPurchaseStmt.get(purchaseId);
        if (existingPurchase && existingPurchase.cliente_id === clienteId) {
          updatePurchaseRecord(purchaseId, purchase, now);
          return;
        }
      }
    }

    insertPurchaseRecord(clienteId, purchase, now);
  });

  return getClienteWithPurchases(clienteId);
});

function updateCliente(id, payload) {
  return updateClienteTransaction(id, payload);
}

function deleteCliente(id) {
  const clienteId = Number(id);
  if (Number.isNaN(clienteId)) {
    return false;
  }

  const result = deleteClienteStmt.run(clienteId);
  return result.changes > 0;
}

function listEventos() {
  return listEventosStmt.all();
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

  const now = new Date().toISOString();
  const result = insertEventoStmt.run(
    data,
    titulo,
    descricao,
    cor,
    cliente_id,
    now,
    now
  );

  return getEventoStmt.get(result.lastInsertRowid);
}

function updateEvento(id, { data, titulo, descricao, cor, cliente_id }) {
  const eventoId = Number(id);
  if (Number.isNaN(eventoId)) {
    return null;
  }

  const existing = getEventoStmt.get(eventoId);
  if (!existing) {
    return null;
  }

  const updated = {
    data: data ?? existing.data,
    titulo: titulo ?? existing.titulo,
    descricao: descricao ?? existing.descricao,
    cor: cor ?? existing.cor,
    cliente_id: cliente_id === undefined ? existing.cliente_id : cliente_id,
  };

  updateEventoStmt.run(
    updated.data,
    updated.titulo,
    updated.descricao,
    updated.cor,
    updated.cliente_id,
    new Date().toISOString(),
    eventoId
  );

  return getEventoStmt.get(eventoId);
}

function deleteEvento(id) {
  const eventoId = Number(id);
  if (Number.isNaN(eventoId)) {
    return false;
  }

  const result = deleteEventoStmt.run(eventoId);
  return result.changes > 0;
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
