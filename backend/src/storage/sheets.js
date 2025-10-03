const clientes = [];
const eventos = [];

let nextClienteId = 1;
let nextEventoId = 1;

function clone(record) {
  return { ...record };
}

function sortClientesByIdDesc(records) {
  return records
    .slice()
    .sort((a, b) => b.id - a.id)
    .map(clone);
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
    .map(clone);
}

function listClientes() {
  return sortClientesByIdDesc(clientes);
}

function createCliente({ nome, telefone = null, email = null }) {
  if (!nome) {
    throw new Error('Campo "nome" é obrigatório.');
  }

  const createdAt = new Date().toISOString();
  const cliente = {
    id: nextClienteId++,
    nome,
    telefone,
    email,
    created_at: createdAt,
  };

  clientes.push(cliente);
  return clone(cliente);
}

function updateCliente(id, { nome, telefone, email }) {
  const clienteId = Number(id);
  if (Number.isNaN(clienteId)) {
    return null;
  }

  const cliente = clientes.find((entry) => entry.id === clienteId);
  if (!cliente) {
    return null;
  }

  cliente.nome = nome ?? cliente.nome;
  cliente.telefone = telefone ?? cliente.telefone;
  cliente.email = email ?? cliente.email;

  return clone(cliente);
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

  const createdAt = new Date().toISOString();
  const evento = {
    id: nextEventoId++,
    data,
    titulo,
    descricao,
    cor,
    cliente_id,
    created_at: createdAt,
  };

  eventos.push(evento);
  return clone(evento);
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

  return clone(evento);
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
