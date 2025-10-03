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

const listClientesStmt = db.prepare(
  'SELECT id, nome, telefone, email, created_at FROM clientes ORDER BY id DESC'
);

const getClienteStmt = db.prepare(
  'SELECT id, nome, telefone, email, created_at FROM clientes WHERE id = ?'
);

const insertClienteStmt = db.prepare(
  'INSERT INTO clientes (nome, telefone, email, created_at) VALUES (?, ?, ?, ?)'
);

const updateClienteStmt = db.prepare(
  'UPDATE clientes SET nome = ?, telefone = ?, email = ? WHERE id = ?'
);

const deleteClienteStmt = db.prepare('DELETE FROM clientes WHERE id = ?');

const listEventosStmt = db.prepare(
  `SELECT id, data, titulo, descricao, cor, cliente_id, created_at
   FROM eventos
   ORDER BY data DESC, id DESC`
);

const getEventoStmt = db.prepare(
  `SELECT id, data, titulo, descricao, cor, cliente_id, created_at
   FROM eventos
   WHERE id = ?`
);

const insertEventoStmt = db.prepare(
  `INSERT INTO eventos (data, titulo, descricao, cor, cliente_id, created_at)
   VALUES (?, ?, ?, ?, ?, ?)`
);

const updateEventoStmt = db.prepare(
  `UPDATE eventos
   SET data = ?, titulo = ?, descricao = ?, cor = ?, cliente_id = ?
   WHERE id = ?`
);

const deleteEventoStmt = db.prepare('DELETE FROM eventos WHERE id = ?');

function listClientes() {
  return listClientesStmt.all();
}

function createCliente({ nome, telefone = null, email = null }) {
  if (!nome) {
    throw new Error('Campo "nome" é obrigatório.');
  }

  const createdAt = new Date().toISOString();
  const result = insertClienteStmt.run(nome, telefone, email, createdAt);
  return getClienteStmt.get(result.lastInsertRowid);
}

function updateCliente(id, { nome, telefone, email }) {
  const clienteId = Number(id);
  if (Number.isNaN(clienteId)) {
    return null;
  }

  const existing = getClienteStmt.get(clienteId);
  if (!existing) {
    return null;
  }

  const updated = {
    nome: nome ?? existing.nome,
    telefone: telefone ?? existing.telefone,
    email: email ?? existing.email,
  };

  updateClienteStmt.run(updated.nome, updated.telefone, updated.email, clienteId);
  return getClienteStmt.get(clienteId);
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

  const createdAt = new Date().toISOString();
  const result = insertEventoStmt.run(
    data,
    titulo,
    descricao,
    cor,
    cliente_id,
    createdAt
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
    cliente_id:
      cliente_id === undefined ? existing.cliente_id : cliente_id,
  };

  updateEventoStmt.run(
    updated.data,
    updated.titulo,
    updated.descricao,
    updated.cor,
    updated.cliente_id,
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
