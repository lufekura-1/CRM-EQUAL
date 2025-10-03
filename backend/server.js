const express = require('express');
const cors = require('cors');
const storage = require('./src/storage');
const { PORT, STORAGE } = require('./src/config/env');

const app = express();

app.use(cors());
app.use(express.json());

function toApiEvento(evento) {
  return {
    id: evento.id,
    date: evento.data,
    title: evento.titulo,
    description: evento.descricao,
    color: evento.cor,
    clientId: evento.cliente_id,
    createdAt: evento.created_at,
  };
}

function fromApiEvento(payload) {
  return {
    data: payload.date,
    titulo: payload.title,
    descricao: payload.description ?? null,
    cor: payload.color ?? null,
    cliente_id: payload.clientId ?? null,
  };
}

function handleError(res, error) {
  if (error?.code === 'NOT_IMPLEMENTED') {
    return res.status(501).json({ error: error.message });
  }

  if (error?.code === 'NOT_CONFIGURED') {
    return res.status(503).json({ error: error.message, details: error.details });
  }

  if (error?.code === 'NOT_FOUND') {
    return res.status(404).json({ error: error.message });
  }

  return res.status(500).json({ error: error?.message || 'Erro interno do servidor.' });
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', storage: STORAGE });
});

app.get('/api/clients', async (req, res) => {
  try {
    const clientes = await Promise.resolve(storage.listClientes());
    res.json({ clients: clientes });
  } catch (error) {
    handleError(res, error);
  }
});

app.post('/api/clients', async (req, res) => {
  try {
    const { nome, telefone = null, email = null } = req.body || {};

    if (!nome) {
      return res.status(400).json({ error: 'Campo "nome" é obrigatório.' });
    }

    const cliente = await Promise.resolve(
      storage.createCliente({ nome, telefone, email })
    );

    res.status(201).json({ client: cliente });
  } catch (error) {
    handleError(res, error);
  }
});

app.put('/api/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, telefone, email } = req.body || {};
    const updated = await Promise.resolve(
      storage.updateCliente(id, { nome, telefone, email })
    );

    if (!updated) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    res.json({ client: updated });
  } catch (error) {
    handleError(res, error);
  }
});

app.delete('/api/clients/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const removed = await Promise.resolve(storage.deleteCliente(id));

    if (!removed) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    res.status(204).send();
  } catch (error) {
    handleError(res, error);
  }
});

app.get('/api/events', async (req, res) => {
  try {
    const eventos = await Promise.resolve(storage.listEventos());
    res.json({ events: eventos.map(toApiEvento) });
  } catch (error) {
    handleError(res, error);
  }
});

app.post('/api/events', async (req, res) => {
  const { date, title, description = null, color = null, clientId = null } =
    req.body || {};

  if (!date || !title) {
    return res
      .status(400)
      .json({ error: 'Campos "date" e "title" são obrigatórios.' });
  }

  try {
    const created = await Promise.resolve(
      storage.createEvento(
        fromApiEvento({ date, title, description, color, clientId })
      )
    );

    res.status(201).json({ event: toApiEvento(created) });
  } catch (error) {
    handleError(res, error);
  }
});

app.put('/api/events/:id', async (req, res) => {
  const { id } = req.params;
  const { date, title, description = null, color = null, clientId = null } =
    req.body || {};

  if (!id) {
    return res.status(400).json({ error: 'O identificador do evento é obrigatório.' });
  }

  try {
    const updated = await Promise.resolve(
      storage.updateEvento(
        id,
        fromApiEvento({ date, title, description, color, clientId })
      )
    );

    if (!updated) {
      return res.status(404).json({ error: 'Evento não encontrado.' });
    }

    res.json({ event: toApiEvento(updated) });
  } catch (error) {
    handleError(res, error);
  }
});

app.delete('/api/events/:id', async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: 'O identificador do evento é obrigatório.' });
  }

  try {
    const removed = await Promise.resolve(storage.deleteEvento(id));
    if (!removed) {
      return res.status(404).json({ error: 'Evento não encontrado.' });
    }

    res.status(204).send();
  } catch (error) {
    handleError(res, error);
  }
});

app.listen(PORT, () => {
  /* eslint-disable no-console */
  console.log(`Servidor iniciado na porta ${PORT}`);
  /* eslint-enable no-console */
});
