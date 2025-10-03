const express = require('express');
const cors = require('cors');
const { z, ZodError } = require('zod');
const storage = require('./src/storage');
const { PORT, STORAGE } = require('./src/config/env');

const app = express();

const corsOptions = {
  origin(origin, callback) {
    if (!origin) {
      return callback(null, true);
    }

    if (/^http:\/\/localhost(?::\d+)?$/.test(origin)) {
      return callback(null, true);
    }

    return callback(new Error('Not allowed by CORS'));
  },
};

app.use(cors(corsOptions));
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

function fromApiEvento(payload, { defaultNull = false } = {}) {
  function normalize(value) {
    if (value === undefined) {
      return defaultNull ? null : undefined;
    }

    return value;
  }

  return {
    data: payload.date,
    titulo: payload.title,
    descricao: normalize(payload.description),
    cor: normalize(payload.color),
    cliente_id: normalize(payload.clientId),
  };
}

function handleError(res, error) {
  if (error instanceof ZodError) {
    const message = error.issues?.[0]?.message || 'Dados inválidos.';
    return res.status(400).json({ error: message });
  }

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

const normalizeNullableStringSchema = z
  .union([z.string(), z.number(), z.literal(null)])
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    const normalized = String(value).trim();
    return normalized.length === 0 ? null : normalized;
  });

const optionalEmailSchema = z
  .union([z.string(), z.literal(null)])
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    const normalized = value.trim();
    return normalized.length === 0 ? null : normalized;
  })
  .refine(
    (value) =>
      value === undefined ||
      value === null ||
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    {
      message: 'Campo "email" deve ser um email válido.',
    }
  );

const clienteCreateSchema = z.object({
  nome: z
    .string({ required_error: 'Campo "nome" é obrigatório.' })
    .trim()
    .min(1, 'Campo "nome" é obrigatório.'),
  telefone: normalizeNullableStringSchema,
  email: optionalEmailSchema,
});

const clienteUpdateSchema = clienteCreateSchema
  .partial()
  .refine((value) => value.nome || value.telefone !== undefined || value.email !== undefined, {
    message: 'Informe ao menos um campo para atualizar.',
  });

const clientesQuerySchema = z.object({
  q: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value === undefined || value.length === 0 ? undefined : value)),
  page: z.coerce.number().int().min(1).optional(),
});

const optionalDateParamSchema = z
  .string()
  .trim()
  .refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value), {
    message: 'Datas devem estar no formato YYYY-MM-DD.',
  });

const eventosQuerySchema = z
  .object({
    from: optionalDateParamSchema.optional(),
    to: optionalDateParamSchema.optional(),
  })
  .refine((value) => {
    if (value.from && value.to) {
      return value.from <= value.to;
    }

    return true;
  }, {
    message: 'O parâmetro "from" deve ser menor ou igual a "to".',
  });

const clientIdSchema = z
  .union([
    z
      .number()
      .int()
      .positive({ message: 'Campo "clientId" deve ser um número inteiro positivo.' }),
    z
      .string()
      .trim()
      .regex(/^\d+$/, { message: 'Campo "clientId" deve ser um número inteiro positivo.' })
      .transform((value) => Number(value)),
    z.literal(null),
  ])
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    return Number(value);
  });

const eventoCreateSchema = z.object({
  date: z
    .string({ required_error: 'Campo "date" é obrigatório.' })
    .trim()
    .min(1, 'Campo "date" é obrigatório.')
    .refine((value) => !Number.isNaN(Date.parse(value)), {
      message: 'Campo "date" deve ser uma data válida.',
    }),
  title: z
    .string({ required_error: 'Campo "title" é obrigatório.' })
    .trim()
    .min(1, 'Campo "title" é obrigatório.'),
  description: normalizeNullableStringSchema,
  color: normalizeNullableStringSchema,
  clientId: clientIdSchema,
});

const eventoUpdateSchema = eventoCreateSchema
  .partial()
  .refine(
    (value) =>
      value.date !== undefined ||
      value.title !== undefined ||
      value.description !== undefined ||
      value.color !== undefined ||
      value.clientId !== undefined,
    { message: 'Informe ao menos um campo para atualizar.' }
  );

const CLIENTES_PAGE_SIZE = 10;

function extractValidationError(error) {
  if (error instanceof ZodError) {
    return error.issues?.[0]?.message || 'Dados inválidos.';
  }

  return 'Dados inválidos.';
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', storage: STORAGE });
});

app.get('/api/clientes', async (req, res) => {
  try {
    const parsedQuery = clientesQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      return res.status(400).json({ error: extractValidationError(parsedQuery.error) });
    }

    const { q, page: rawPage } = parsedQuery.data;
    const page = rawPage ?? 1;

    const clientes = await Promise.resolve(storage.listClientes());
    const filteredClientes =
      q === undefined
        ? clientes
        : clientes.filter((cliente) => {
            const normalizedQuery = q.toLowerCase();
            return ['nome', 'email', 'telefone'].some((field) => {
              const value = cliente[field];
              if (value === undefined || value === null) {
                return false;
              }

              return String(value).toLowerCase().includes(normalizedQuery);
            });
          });

    const total = filteredClientes.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / CLIENTES_PAGE_SIZE);
    const start = (page - 1) * CLIENTES_PAGE_SIZE;
    const end = start + CLIENTES_PAGE_SIZE;
    const paginatedClientes = filteredClientes.slice(start, end);

    res.json({
      clientes: paginatedClientes,
      page,
      pageSize: CLIENTES_PAGE_SIZE,
      total,
      totalPages,
    });
  } catch (error) {
    handleError(res, error);
  }
});

app.post('/api/clientes', async (req, res) => {
  try {
    const parsedBody = clienteCreateSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ error: extractValidationError(parsedBody.error) });
    }

    const { nome, telefone, email } = parsedBody.data;
    const cliente = await Promise.resolve(
      storage.createCliente({
        nome,
        telefone: telefone ?? null,
        email: email ?? null,
      })
    );

    res.status(201).json({ cliente });
  } catch (error) {
    handleError(res, error);
  }
});

app.put('/api/clientes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const parsedBody = clienteUpdateSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ error: extractValidationError(parsedBody.error) });
    }

    const { nome, telefone, email } = parsedBody.data;
    const updated = await Promise.resolve(
      storage.updateCliente(id, {
        nome,
        telefone: telefone === undefined ? undefined : telefone,
        email: email === undefined ? undefined : email,
      })
    );

    if (!updated) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    res.json({ cliente: updated });
  } catch (error) {
    handleError(res, error);
  }
});

app.delete('/api/clientes/:id', async (req, res) => {
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

app.get('/api/eventos', async (req, res) => {
  try {
    const parsedQuery = eventosQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      return res.status(400).json({ error: extractValidationError(parsedQuery.error) });
    }

    const { from, to } = parsedQuery.data;
    const fromDate = from ? new Date(`${from}T00:00:00.000Z`) : null;
    const toDate = to ? new Date(`${to}T23:59:59.999Z`) : null;

    const eventos = await Promise.resolve(storage.listEventos());
    const filteredEventos = eventos.filter((evento) => {
      if (!fromDate && !toDate) {
        return true;
      }

      const eventoDate = new Date(evento.data);
      if (Number.isNaN(eventoDate.getTime())) {
        return false;
      }

      if (fromDate && eventoDate < fromDate) {
        return false;
      }

      if (toDate && eventoDate > toDate) {
        return false;
      }

      return true;
    });

    res.json({ eventos: filteredEventos.map(toApiEvento) });
  } catch (error) {
    handleError(res, error);
  }
});

app.post('/api/eventos', async (req, res) => {
  try {
    const parsedBody = eventoCreateSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ error: extractValidationError(parsedBody.error) });
    }

    const { date, title, description, color, clientId } = parsedBody.data;
    const created = await Promise.resolve(
      storage.createEvento(
        fromApiEvento(
          {
            date,
            title,
            description: description ?? null,
            color: color ?? null,
            clientId: clientId ?? null,
          },
          { defaultNull: true }
        )
      )
    );

    res.status(201).json({ evento: toApiEvento(created) });
  } catch (error) {
    handleError(res, error);
  }
});

app.put('/api/eventos/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const parsedBody = eventoUpdateSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ error: extractValidationError(parsedBody.error) });
    }

    const { date, title, description, color, clientId } = parsedBody.data;
    const updated = await Promise.resolve(
      storage.updateEvento(
        id,
        fromApiEvento({ date, title, description, color, clientId })
      )
    );

    if (!updated) {
      return res.status(404).json({ error: 'Evento não encontrado.' });
    }

    res.json({ evento: toApiEvento(updated) });
  } catch (error) {
    handleError(res, error);
  }
});

app.delete('/api/eventos/:id', async (req, res) => {
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
