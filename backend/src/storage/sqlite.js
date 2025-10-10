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
    completed INTEGER NOT NULL DEFAULT 0,
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

db.exec(`
  CREATE TABLE IF NOT EXISTS contatos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL,
    compra_id INTEGER,
    data_compra TEXT,
    data_contato TEXT NOT NULL,
    prazo_meses INTEGER NOT NULL,
    efetuado INTEGER NOT NULL DEFAULT 0,
    efetuado_em TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
    FOREIGN KEY (compra_id) REFERENCES compras(id) ON DELETE CASCADE
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
ensureColumn('clientes', 'cpf_normalizado', 'TEXT');
ensureColumn('clientes', 'genero', 'TEXT');
ensureColumn('clientes', 'data_nascimento', 'TEXT');
ensureColumn('clientes', 'aceita_contato', 'INTEGER DEFAULT 0');
ensureColumn('clientes', 'tipo_usuario', 'TEXT');
ensureColumn('clientes', 'usuario_id', 'TEXT');
ensureColumn('clientes', 'estado_cliente', 'TEXT');
ensureColumn('clientes', 'interesses', 'TEXT');
ensureColumn('clientes', 'updated_at', 'TEXT');

ensureColumn('eventos', 'updated_at', 'TEXT');
ensureColumn('eventos', 'cliente_id', 'INTEGER');
ensureColumn('eventos', 'completed', 'INTEGER DEFAULT 0');
ensureColumn('eventos', 'usuario_id', 'TEXT');

function migrateContactsTableToAllowStandaloneEntries() {
  const info = db.pragma('table_info(contatos)');
  const compraIdColumn = info.find((entry) => entry.name === 'compra_id');
  const dataCompraColumn = info.find((entry) => entry.name === 'data_compra');

  const needsMigration =
    (compraIdColumn && compraIdColumn.notnull === 1) ||
    (dataCompraColumn && dataCompraColumn.notnull === 1);

  if (!needsMigration) {
    return;
  }

  db.exec('PRAGMA foreign_keys=OFF;');

  db.exec(`
    CREATE TABLE contatos_tmp (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_id INTEGER NOT NULL,
      compra_id INTEGER,
      data_compra TEXT,
      data_contato TEXT NOT NULL,
      prazo_meses INTEGER NOT NULL,
      efetuado INTEGER NOT NULL DEFAULT 0,
      efetuado_em TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
      FOREIGN KEY (compra_id) REFERENCES compras(id) ON DELETE CASCADE
    );
  `);

  db.exec(`
    INSERT INTO contatos_tmp (
      id,
      cliente_id,
      compra_id,
      data_compra,
      data_contato,
      prazo_meses,
      efetuado,
      efetuado_em,
      created_at,
      updated_at
    )
    SELECT
      id,
      cliente_id,
      compra_id,
      data_compra,
      data_contato,
      prazo_meses,
      efetuado,
      efetuado_em,
      created_at,
      updated_at
    FROM contatos;
  `);

  db.exec('DROP TABLE contatos;');
  db.exec('ALTER TABLE contatos_tmp RENAME TO contatos;');
  db.exec('PRAGMA foreign_keys=ON;');
}

migrateContactsTableToAllowStandaloneEntries();

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

const CONTACT_SCHEDULE_OFFSETS = [1, 3, 6, 12];
const CONTACT_STATUS_LABELS = {
  completed: 'Efetuado',
  overdue: 'Atrasado',
  pending: 'Pendente',
};

const listClientesStmt = db.prepare(`
  SELECT
    id,
    nome,
    telefone,
    email,
    cpf,
    cpf_normalizado,
    genero,
    data_nascimento,
    aceita_contato,
    tipo_usuario,
    usuario_id,
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
    cpf_normalizado,
    genero,
    data_nascimento,
    aceita_contato,
    tipo_usuario,
    usuario_id,
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
    cpf_normalizado,
    genero,
    data_nascimento,
    aceita_contato,
    tipo_usuario,
    usuario_id,
    estado_cliente,
    interesses,
    created_at,
    updated_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const updateClienteStmt = db.prepare(`
  UPDATE clientes
  SET
    nome = ?,
    telefone = ?,
    email = ?,
    cpf = ?,
    cpf_normalizado = ?,
    genero = ?,
    data_nascimento = ?,
    aceita_contato = ?,
    tipo_usuario = ?,
    usuario_id = ?,
    estado_cliente = ?,
    interesses = ?,
    updated_at = ?
  WHERE id = ?
`);

const updateClientStateValueStmt = db.prepare(`
  UPDATE clientes
  SET estado_cliente = ?, updated_at = ?
  WHERE id = ?
`);

const listClientCpfStmt = db.prepare(`
  SELECT id, cpf
  FROM clientes
  WHERE cpf IS NOT NULL
`);

const updateClientCpfNormalizedStmt = db.prepare(`
  UPDATE clientes
  SET cpf_normalizado = ?
  WHERE id = ?
`);

const findClienteByCpfStmt = db.prepare(`
  SELECT id
  FROM clientes
  WHERE cpf_normalizado = ?
  LIMIT 1
`);

listClientCpfStmt
  .all()
  .forEach(({ id, cpf }) => {
    const normalized = normalizeCpfKey(cpf);
    updateClientCpfNormalizedStmt.run(normalized, id);
  });

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

const listContactsStmt = db.prepare(`
  SELECT
    id,
    cliente_id,
    compra_id,
    data_compra,
    data_contato,
    prazo_meses,
    efetuado,
    efetuado_em,
    created_at,
    updated_at
  FROM contatos
  ORDER BY data_contato ASC, id ASC
`);

const listContactsByClienteStmt = db.prepare(`
  SELECT
    id,
    cliente_id,
    compra_id,
    data_compra,
    data_contato,
    prazo_meses,
    efetuado,
    efetuado_em,
    created_at,
    updated_at
  FROM contatos
  WHERE cliente_id = ?
  ORDER BY data_contato ASC, id ASC
`);

const listContactsByPurchaseStmt = db.prepare(`
  SELECT
    id,
    cliente_id,
    compra_id,
    data_compra,
    data_contato,
    prazo_meses,
    efetuado,
    efetuado_em,
    created_at,
    updated_at
  FROM contatos
  WHERE compra_id = ?
  ORDER BY data_contato ASC, id ASC
`);

const getContactStmt = db.prepare(`
  SELECT
    id,
    cliente_id,
    compra_id,
    data_compra,
    data_contato,
    prazo_meses,
    efetuado,
    efetuado_em,
    created_at,
    updated_at
  FROM contatos
  WHERE id = ?
`);

const getContactByPurchaseAndMonthsStmt = db.prepare(`
  SELECT
    id,
    cliente_id,
    compra_id,
    data_compra,
    data_contato,
    prazo_meses,
    efetuado,
    efetuado_em,
    created_at,
    updated_at
  FROM contatos
  WHERE compra_id = ? AND prazo_meses = ?
  LIMIT 1
`);

const getStandaloneContactByClientAndMonthsStmt = db.prepare(`
  SELECT
    id,
    cliente_id,
    compra_id,
    data_compra,
    data_contato,
    prazo_meses,
    efetuado,
    efetuado_em,
    created_at,
    updated_at
  FROM contatos
  WHERE cliente_id = ? AND compra_id IS NULL AND prazo_meses = ?
  LIMIT 1
`);

const insertContactStmt = db.prepare(`
  INSERT INTO contatos (
    cliente_id,
    compra_id,
    data_compra,
    data_contato,
    prazo_meses,
    efetuado,
    efetuado_em,
    created_at,
    updated_at
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const updateContactScheduleStmt = db.prepare(`
  UPDATE contatos
  SET data_compra = ?, data_contato = ?, updated_at = ?
  WHERE id = ?
`);

const updateContactCompletionStmt = db.prepare(`
  UPDATE contatos
  SET efetuado = ?, efetuado_em = ?, updated_at = ?
  WHERE id = ?
`);

const listEventosStmt = db.prepare(`
  SELECT id, data, titulo, descricao, cor, cliente_id, completed, usuario_id, created_at, updated_at
  FROM eventos
  ORDER BY data DESC, id DESC
`);

const getEventoStmt = db.prepare(`
  SELECT id, data, titulo, descricao, cor, cliente_id, completed, usuario_id, created_at, updated_at
  FROM eventos
  WHERE id = ?
`);

const insertEventoStmt = db.prepare(`
  INSERT INTO eventos (data, titulo, descricao, cor, cliente_id, completed, usuario_id, created_at, updated_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const updateEventoStmt = db.prepare(`
  UPDATE eventos
  SET data = ?, titulo = ?, descricao = ?, cor = ?, cliente_id = ?, completed = ?, usuario_id = ?, updated_at = ?
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

function normalizeCpfKey(value) {
  if (value === undefined || value === null) {
    return null;
  }
  const digits = String(value)
    .trim()
    .replace(/\D/g, '');
  return digits.length > 0 ? digits : null;
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

function assertCpfAvailable(cpfValue, { ignoreId } = {}) {
  const normalized = normalizeCpfKey(cpfValue);
  if (!normalized) {
    return;
  }

  const existing = findClienteByCpfStmt.get(normalized);
  if (existing && Number(existing.id) !== Number(ignoreId)) {
    const error = new Error('Já existe um cliente cadastrado com este CPF.');
    error.code = 'CONFLICT';
    throw error;
  }
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
    userId: row.usuario_id ?? null,
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
    contacts: [],
  };
}

function normalizeToIsoDate(value) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  const text = String(value).trim();
  if (!text) {
    return null;
  }

  const normalized = text.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null;
}

function resolveContactStatus(contactDate, completed) {
  if (completed) {
    return { key: 'completed', label: CONTACT_STATUS_LABELS.completed };
  }

  const normalizedDate = normalizeToIsoDate(contactDate);
  if (!normalizedDate) {
    return { key: 'pending', label: CONTACT_STATUS_LABELS.pending };
  }

  const todayIso = new Date().toISOString().slice(0, 10);
  if (normalizedDate < todayIso) {
    return { key: 'overdue', label: CONTACT_STATUS_LABELS.overdue };
  }

  return { key: 'pending', label: CONTACT_STATUS_LABELS.pending };
}

function mapContactRow(row) {
  const contactDate = row.data_contato ?? null;
  const completed = Boolean(row.efetuado);
  const { key: statusKey, label: statusLabel } = resolveContactStatus(contactDate, completed);

  return {
    id: row.id,
    clientId: row.cliente_id,
    purchaseId: row.compra_id,
    purchaseDate: row.data_compra ?? null,
    contactDate,
    monthsOffset: row.prazo_meses ?? null,
    completed,
    completedAt: row.efetuado_em ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
    status: statusKey,
    statusLabel,
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

function groupContactsByPurchase(rows) {
  const grouped = new Map();
  rows.forEach((row) => {
    const contact = mapContactRow(row);
    const purchaseId = row.compra_id;
    const key =
      purchaseId === null || purchaseId === undefined
        ? `standalone:${row.cliente_id}`
        : purchaseId;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key).push(contact);
  });
  return grouped;
}

function attachContactsToPurchases(purchases, contactsByPurchase) {
  if (!Array.isArray(purchases)) {
    return;
  }
  purchases.forEach((purchase) => {
    const purchaseContacts = contactsByPurchase.get(purchase.id) || [];
    purchase.contacts = purchaseContacts
      .slice()
      .sort((a, b) => {
        const monthsA = Number.isFinite(a.monthsOffset) ? a.monthsOffset : Number.MAX_SAFE_INTEGER;
        const monthsB = Number.isFinite(b.monthsOffset) ? b.monthsOffset : Number.MAX_SAFE_INTEGER;
        if (monthsA !== monthsB) {
          return monthsA - monthsB;
        }
        return (a.contactDate || '').localeCompare(b.contactDate || '');
      });
  });
}

function determineClientState(purchases) {
  if (!Array.isArray(purchases) || purchases.length === 0) {
    return 'oferta';
  }

  const sorted = purchases
    .slice()
    .sort((a, b) => {
      const dateA = a.date ? new Date(`${a.date}T00:00:00`).getTime() : 0;
      const dateB = b.date ? new Date(`${b.date}T00:00:00`).getTime() : 0;
      return dateB - dateA;
    });

  const latest = sorted[0];
  const contacts = Array.isArray(latest.contacts) ? latest.contacts : [];
  const hasPending = contacts.some((contact) => !contact.completed);
  return hasPending ? 'pos-venda' : 'oferta';
}

function recomputeClientState(clienteId) {
  const purchases = listPurchasesByClienteStmt.all(clienteId).map(mapPurchaseRow);
  const contactRows = fetchContactRowsForClient(clienteId);
  const contactsByPurchase = groupContactsByPurchase(contactRows);
  attachContactsToPurchases(purchases, contactsByPurchase);
  const state = determineClientState(purchases);
  const now = new Date().toISOString();
  updateClientStateValueStmt.run(state, now, clienteId);
  return state;
}

const updateContactStatusTransaction = db.transaction((contactId, completed) => {
  const contactIdNumber = Number(contactId);
  if (Number.isNaN(contactIdNumber)) {
    return null;
  }

  const existing = getContactStmt.get(contactIdNumber);
  if (!existing) {
    return null;
  }

  const now = new Date().toISOString();
  updateContactCompletionStmt.run(completed ? 1 : 0, completed ? now : null, now, contactIdNumber);

  const updated = getContactStmt.get(contactIdNumber);
  if (!updated) {
    return null;
  }

  recomputeClientState(updated.cliente_id);
  const mappedContact = mapContactRow(updated);
  const cliente = getClienteWithPurchases(updated.cliente_id);
  return { contact: mappedContact, cliente };
});

function updateContactStatus(contactId, completed) {
  return updateContactStatusTransaction(contactId, completed);
}

function fetchContactRowsForClient(clienteId) {
  if (!clienteId) {
    return [];
  }

  const directRows = listContactsByClienteStmt.all(clienteId);
  if (directRows.length > 0) {
    return directRows;
  }

  const fallbackRows = listContactsStmt.all().filter((row) => row.cliente_id === clienteId);
  return fallbackRows;
}

function listContacts() {
  return listContactsStmt.all().map(mapContactRow);
}

(function bootstrapContactsAndStates() {
  const now = new Date().toISOString();
  const allPurchases = listPurchasesStmt.all();
  allPurchases.forEach((purchase) => {
    ensureContactsForPurchase(purchase.cliente_id, purchase.id, purchase.data, now);
  });

  const clients = listClientesStmt.all();
  clients.forEach((clientRow) => {
    const clientPurchases = listPurchasesByClienteStmt.all(clientRow.id);
    if (!clientPurchases.length) {
      ensureContactsForClient(clientRow.id, clientRow.created_at ?? now, now);
    }
    recomputeClientState(clientRow.id);
  });
})();

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

function addMonthsToIsoDate(dateString, monthsToAdd) {
  if (!dateString || typeof dateString !== 'string') {
    return null;
  }
  const [yearStr, monthStr, dayStr] = dateString.slice(0, 10).split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  date.setUTCMonth(date.getUTCMonth() + Number(monthsToAdd || 0));
  const resultYear = date.getUTCFullYear();
  const resultMonth = String(date.getUTCMonth() + 1).padStart(2, '0');
  const resultDay = String(date.getUTCDate()).padStart(2, '0');
  return `${resultYear}-${resultMonth}-${resultDay}`;
}

function ensureContactsForPurchase(clienteId, purchaseId, purchaseDate, timestamp) {
  if (!clienteId || !purchaseId || !purchaseDate) {
    return;
  }

  const normalizedDate = String(purchaseDate).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
    return;
  }

  const effectiveTimestamp = timestamp || new Date().toISOString();

  CONTACT_SCHEDULE_OFFSETS.forEach((months) => {
    const contactDate = addMonthsToIsoDate(normalizedDate, months);
    if (!contactDate) {
      return;
    }

    const existing = getContactByPurchaseAndMonthsStmt.get(purchaseId, months);
    if (existing) {
      updateContactScheduleStmt.run(normalizedDate, contactDate, effectiveTimestamp, existing.id);
      return;
    }

    insertContactStmt.run(
      clienteId,
      purchaseId,
      normalizedDate,
      contactDate,
      months,
      0,
      null,
      effectiveTimestamp,
      effectiveTimestamp
    );
  });
}

function ensureContactsForClient(clienteId, baseDate, timestamp) {
  if (!clienteId) {
    return;
  }

  const normalizedBaseDate = normalizeToIsoDate(baseDate) || normalizeToIsoDate(timestamp);
  if (!normalizedBaseDate) {
    return;
  }

  const effectiveTimestamp = timestamp || new Date().toISOString();

  CONTACT_SCHEDULE_OFFSETS.forEach((months) => {
    const contactDate = addMonthsToIsoDate(normalizedBaseDate, months);
    if (!contactDate) {
      return;
    }

    const existing = getStandaloneContactByClientAndMonthsStmt.get(clienteId, months);
    if (existing) {
      updateContactScheduleStmt.run(normalizedBaseDate, contactDate, effectiveTimestamp, existing.id);
      return;
    }

    insertContactStmt.run(
      clienteId,
      null,
      normalizedBaseDate,
      contactDate,
      months,
      0,
      null,
      effectiveTimestamp,
      effectiveTimestamp
    );
  });
}

function insertPurchaseRecord(clienteId, purchase, timestamp) {
  const result = insertPurchaseStmt.run(
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

  const purchaseId = result.lastInsertRowid;
  ensureContactsForPurchase(clienteId, purchaseId, purchase.date, timestamp);
  return purchaseId;
}

function updatePurchaseRecord(clienteId, purchaseId, purchase, timestamp) {
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

  ensureContactsForPurchase(clienteId, purchaseId, purchase.date, timestamp);
}

function getClienteWithPurchases(clienteId) {
  const row = getClienteStmt.get(clienteId);
  if (!row) {
    return null;
  }
  const cliente = mapClienteRow(row);
  const purchases = listPurchasesByClienteStmt.all(clienteId).map(mapPurchaseRow);
  const contactRows = fetchContactRowsForClient(clienteId);
  const contactsByPurchase = groupContactsByPurchase(contactRows);
  attachContactsToPurchases(purchases, contactsByPurchase);
  const standaloneKey = `standalone:${clienteId}`;
  const standaloneContacts = contactsByPurchase.get(standaloneKey) || [];
  cliente.purchases = purchases;
  cliente.contacts = purchases
    .flatMap((purchase) => purchase.contacts || [])
    .concat(standaloneContacts);
  cliente.lastPurchase = purchases.length ? purchases[purchases.length - 1].date : null;
  cliente.state = determineClientState(purchases);
  return cliente;
}

function listClientes() {
  const rows = listClientesStmt.all();
  if (rows.length === 0) {
    return [];
  }
  const purchases = listPurchasesStmt.all();
  const contacts = listContactsStmt.all();
  const groupedPurchases = groupPurchasesByClient(purchases);
  const contactsByPurchase = groupContactsByPurchase(contacts);
  return rows.map((row) => {
    const cliente = mapClienteRow(row);
    const clientPurchases = groupedPurchases.get(cliente.id) || [];
    attachContactsToPurchases(clientPurchases, contactsByPurchase);
    const standaloneKey = `standalone:${cliente.id}`;
    const standaloneContacts = contactsByPurchase.get(standaloneKey) || [];
    cliente.purchases = clientPurchases;
    cliente.contacts = clientPurchases
      .flatMap((purchase) => purchase.contacts || [])
      .concat(standaloneContacts);
    cliente.lastPurchase = clientPurchases.length
      ? clientPurchases[clientPurchases.length - 1].date
      : null;
    cliente.state = determineClientState(clientPurchases);
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
  assertCpfAvailable(cpf);
  const cpfNormalized = normalizeCpfKey(cpf);
  const gender = normalizeGender(payload.gender);
  const birthDate = normalizeBirthDate(payload.birthDate);
  const userType = normalizeUserType(payload.userType);
  const userId = toNullableText(payload.userId);
  const state = 'pos-venda';
  const acceptsContact = Boolean(payload.acceptsContact);

  const result = insertClienteStmt.run(
    nome,
    telefone,
    email,
    cpf,
    cpfNormalized,
    gender,
    birthDate,
    acceptsContact ? 1 : 0,
    userType,
    userId,
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

  const purchasesAfterCreate = listPurchasesByClienteStmt.all(clienteId);
  if (!purchasesAfterCreate.length) {
    ensureContactsForClient(clienteId, now, now);
  }

  return { clienteId, createdAt: now };
});

function createCliente(payload) {
  const result = createClienteTransaction(payload);
  const clienteId = result?.clienteId;
  if (!clienteId) {
    return null;
  }

  recomputeClientState(clienteId);
  return getClienteWithPurchases(clienteId);
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
    userId:
      payload.userId === undefined
        ? current.userId
        : toNullableText(payload.userId),
    state: current.state,
  };

  if (payload.cpf !== undefined) {
    assertCpfAvailable(updatedFields.cpf, { ignoreId: clienteId });
  }

  const normalizedName = String(updatedFields.nome).trim();
  const cpfNormalized = normalizeCpfKey(updatedFields.cpf);

  updateClienteStmt.run(
    normalizedName,
    toNullableText(updatedFields.telefone),
    toNullableText(updatedFields.email),
    toNullableText(updatedFields.cpf),
    cpfNormalized,
    toNullableText(updatedFields.gender),
    toNullableText(updatedFields.birthDate),
    updatedFields.acceptsContact ? 1 : 0,
    toNullableText(updatedFields.userType),
    toNullableText(updatedFields.userId),
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
          updatePurchaseRecord(clienteId, purchaseId, purchase, now);
          return;
        }
      }
    }

    insertPurchaseRecord(clienteId, purchase, now);
  });

  const purchasesAfterUpdate = listPurchasesByClienteStmt.all(clienteId);
  if (!purchasesAfterUpdate.length) {
    ensureContactsForClient(clienteId, current.createdAt ?? now, now);
  }

  return { clienteId, updatedAt: now };
});

function updateCliente(id, payload) {
  const result = updateClienteTransaction(id, payload);
  const clienteId = result?.clienteId;
  if (!clienteId) {
    return null;
  }

  recomputeClientState(clienteId);
  return getClienteWithPurchases(clienteId);
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

function normalizeCompletedFlag(value, fallback = 0) {
  if (value === undefined || value === null) {
    return fallback ? 1 : 0;
  }
  return value ? 1 : 0;
}

function createEvento({
  data,
  titulo,
  descricao = null,
  cor = null,
  cliente_id = null,
  completed = 0,
  usuario_id = null,
  user_id = null,
  userId = null,
}) {
  if (!data || !titulo) {
    throw new Error('Campos "data" e "titulo" são obrigatórios.');
  }

  const now = new Date().toISOString();
  const normalizedUserId = toNullableText(userId ?? usuario_id ?? user_id);
  const result = insertEventoStmt.run(
    data,
    titulo,
    descricao,
    cor,
    cliente_id,
    normalizeCompletedFlag(completed),
    normalizedUserId,
    now,
    now
  );

  return getEventoStmt.get(result.lastInsertRowid);
}

function updateEvento(
  id,
  { data, titulo, descricao, cor, cliente_id, completed, usuario_id, user_id, userId }
) {
  const eventoId = Number(id);
  if (Number.isNaN(eventoId)) {
    return null;
  }

  const existing = getEventoStmt.get(eventoId);
  if (!existing) {
    return null;
  }

  const userIdInput = userId ?? usuario_id ?? user_id;
  const updated = {
    data: data ?? existing.data,
    titulo: titulo ?? existing.titulo,
    descricao: descricao ?? existing.descricao,
    cor: cor ?? existing.cor,
    cliente_id: cliente_id === undefined ? existing.cliente_id : cliente_id,
    completed:
      completed === undefined
        ? normalizeCompletedFlag(existing.completed)
        : normalizeCompletedFlag(completed, existing.completed),
    usuario_id:
      userIdInput === undefined ? existing.usuario_id ?? null : toNullableText(userIdInput),
  };

  updateEventoStmt.run(
    updated.data,
    updated.titulo,
    updated.descricao,
    updated.cor,
    updated.cliente_id,
    updated.completed,
    updated.usuario_id,
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
  listContacts,
  updateContactStatus,
};
