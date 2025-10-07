const express = require('express');
const cors = require('cors');
const { z, ZodError } = require('zod');
const storage = require('./src/storage');
const { PORT, STORAGE } = require('./src/config/env');

const app = express();

const corsOptions = {
  origin: ["http://localhost:5500", "http://127.0.0.1:5500"],
  optionsSuccessStatus: 200,
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

  if (error?.code === 'CONFLICT') {
    return res.status(409).json({ error: error.message || 'Conflito ao processar a requisição.' });
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

const optionalBooleanSchema = z
  .union([z.boolean(), z.number(), z.string(), z.literal(null)])
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return value !== 0;
    }

    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'sim'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'nao', 'não'].includes(normalized)) {
      return false;
    }

    throw new Error('Campo "acceptsContact" deve ser um booleano válido.');
  });

const optionalBirthDateSchema = z
  .union([z.string(), z.literal(null)])
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return null;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      throw new Error('Campo "birthDate" deve estar no formato YYYY-MM-DD.');
    }

    return trimmed;
  });

const optionalNumberSchema = z
  .union([z.number(), z.string(), z.literal(null)])
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    if (typeof value === 'number') {
      if (!Number.isFinite(value)) {
        throw new Error('Valor numérico inválido.');
      }
      return value;
    }

    const normalized = Number(value.replace(',', '.'));
    if (Number.isNaN(normalized)) {
      throw new Error('Valor numérico inválido.');
    }

    return normalized;
  });

const dioptryEyeSchema = z
  .union([
    z
      .object({
        spherical: normalizeNullableStringSchema,
        cylindrical: normalizeNullableStringSchema,
        axis: normalizeNullableStringSchema,
        dnp: normalizeNullableStringSchema,
        addition: normalizeNullableStringSchema,
      })
      .partial(),
    z.literal(null),
  ])
  .optional()
  .transform((value) => {
    const source = value && typeof value === 'object' ? value : {};
    return {
      spherical: source.spherical ?? null,
      cylindrical: source.cylindrical ?? null,
      axis: source.axis ?? null,
      dnp: source.dnp ?? null,
      addition: source.addition ?? null,
    };
  });

const dioptrySchema = z
  .object({
    oe: dioptryEyeSchema,
    od: dioptryEyeSchema,
  })
  .optional()
  .transform((value) => {
    const oe = value?.oe ?? {};
    const od = value?.od ?? {};
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
  });

const purchaseSchema = z.object({
  id: normalizeNullableStringSchema,
  date: z
    .string({ required_error: 'Campo "purchase.date" é obrigatório.' })
    .trim()
    .min(1, 'Campo "purchase.date" é obrigatório.')
    .refine((value) => /^\d{4}-\d{2}-\d{2}$/.test(value), {
      message: 'Campo "purchase.date" deve estar no formato YYYY-MM-DD.',
    }),
  frame: normalizeNullableStringSchema,
  frameMaterial: normalizeNullableStringSchema,
  frameValue: optionalNumberSchema,
  lens: normalizeNullableStringSchema,
  lensValue: optionalNumberSchema,
  invoice: normalizeNullableStringSchema,
  dioptry: dioptrySchema,
});

const optionalInterestsSchema = z
  .array(z.union([z.string(), z.number()]))
  .optional()
  .transform((value) => {
    if (value === undefined) {
      return undefined;
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
      const key = trimmed.toLowerCase();
      if (seen.has(key)) {
        return;
      }
      seen.add(key);
      normalized.push(trimmed);
    });

    return normalized;
  });

const clienteCreateSchema = z.object({
  nome: z
    .string({ required_error: 'Campo "nome" é obrigatório.' })
    .trim()
    .min(1, 'Campo "nome" é obrigatório.'),
  telefone: normalizeNullableStringSchema,
  email: optionalEmailSchema,
  cpf: normalizeNullableStringSchema,
  gender: normalizeNullableStringSchema,
  birthDate: optionalBirthDateSchema,
  acceptsContact: optionalBooleanSchema,
  userType: normalizeNullableStringSchema,
  state: normalizeNullableStringSchema,
  interests: optionalInterestsSchema,
  purchase: purchaseSchema.optional(),
  purchases: z.array(purchaseSchema).optional(),
});

const clienteUpdateSchema = clienteCreateSchema
  .partial()
  .refine(
    (value) =>
      value.nome !== undefined ||
      value.telefone !== undefined ||
      value.email !== undefined ||
      value.cpf !== undefined ||
      value.gender !== undefined ||
      value.birthDate !== undefined ||
      value.acceptsContact !== undefined ||
      value.userType !== undefined ||
      value.state !== undefined ||
      value.interests !== undefined ||
      value.purchase !== undefined ||
      value.purchases !== undefined,
    {
      message: 'Informe ao menos um campo para atualizar.',
    }
  );

function normalizeClientRequestBody(body) {
  if (!body || typeof body !== 'object') {
    return body;
  }

  const normalized = { ...body };

  if (normalized.dataNascimento !== undefined && normalized.birthDate === undefined) {
    normalized.birthDate = normalized.dataNascimento;
  }
  if (normalized['data_nascimento'] !== undefined && normalized.birthDate === undefined) {
    normalized.birthDate = normalized['data_nascimento'];
  }
  if (normalized.genero !== undefined && normalized.gender === undefined) {
    normalized.gender = normalized.genero;
  }
  if (normalized.aceitaContato !== undefined && normalized.acceptsContact === undefined) {
    normalized.acceptsContact = normalized.aceitaContato;
  }
  if (normalized['aceita_contato'] !== undefined && normalized.acceptsContact === undefined) {
    normalized.acceptsContact = normalized['aceita_contato'];
  }
  if (normalized.tipoUsuario !== undefined && normalized.userType === undefined) {
    normalized.userType = normalized.tipoUsuario;
  }
  if (normalized['tipo_usuario'] !== undefined && normalized.userType === undefined) {
    normalized.userType = normalized['tipo_usuario'];
  }
  if (normalized.estadoCliente !== undefined && normalized.state === undefined) {
    normalized.state = normalized.estadoCliente;
  }
  if (normalized['estado_cliente'] !== undefined && normalized.state === undefined) {
    normalized.state = normalized['estado_cliente'];
  }
  if (normalized.interesses !== undefined && normalized.interests === undefined) {
    normalized.interests = normalized.interesses;
  }
  if (normalized.compra !== undefined && normalized.purchase === undefined) {
    normalized.purchase = normalized.compra;
  }
  if (normalized.compras !== undefined && normalized.purchases === undefined) {
    normalized.purchases = normalized.compras;
  }

  return normalized;
}

function normalizeAcceptsContactInput(value, { allowUndefined = false } = {}) {
  if (value === undefined) {
    return allowUndefined ? undefined : false;
  }

  if (value === null) {
    return false;
  }

  return Boolean(value);
}

function cloneDioptry(dioptry = {}) {
  const oe = dioptry?.oe || {};
  const od = dioptry?.od || {};
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

function decoratePurchaseResponse(purchase) {
  if (!purchase) {
    return null;
  }

  const dioptry = cloneDioptry(purchase.dioptry);

  const contacts = Array.isArray(purchase.contacts)
    ? purchase.contacts.map((contact) => decorateContactResponse(contact)).filter(Boolean)
    : [];

  return {
    ...purchase,
    dioptry,
    armacao: purchase.frame ?? '',
    materialArmacao: purchase.frameMaterial ?? '',
    material_armacao: purchase.frameMaterial ?? '',
    valorArmacao: purchase.frameValue ?? null,
    valor_armacao: purchase.frameValue ?? null,
    lente: purchase.lens ?? '',
    valorLente: purchase.lensValue ?? null,
    valor_lente: purchase.lensValue ?? null,
    notaFiscal: purchase.invoice ?? '',
    nota_fiscal: purchase.invoice ?? '',
    contacts,
    contatos: contacts,
  };
}

function decorateContactResponse(contact) {
  if (!contact) {
    return null;
  }

  const completed = Boolean(contact.completed);

  return {
    ...contact,
    completed,
    contactDate: contact.contactDate ?? null,
    purchaseDate: contact.purchaseDate ?? null,
    monthsOffset: contact.monthsOffset ?? null,
    clienteId: contact.clientId ?? null,
    cliente_id: contact.clientId ?? null,
    compraId: contact.purchaseId ?? null,
    compra_id: contact.purchaseId ?? null,
    dataContato: contact.contactDate ?? null,
    data_contato: contact.contactDate ?? null,
    dataCompra: contact.purchaseDate ?? null,
    data_compra: contact.purchaseDate ?? null,
    prazoMeses: contact.monthsOffset ?? null,
    prazo_meses: contact.monthsOffset ?? null,
    efetuado: completed,
    efetuadoEm: contact.completedAt ?? null,
    efetuado_em: contact.completedAt ?? null,
  };
}

function decorateClientResponse(cliente) {
  if (!cliente) {
    return null;
  }

  const interests = Array.isArray(cliente.interests)
    ? cliente.interests.map((item) => (item === undefined || item === null ? null : String(item).trim()))
    : [];
  const filteredInterests = interests.filter((item) => item && item.length > 0);

  const purchases = Array.isArray(cliente.purchases)
    ? cliente.purchases
        .map((purchase) => decoratePurchaseResponse(purchase))
        .filter((purchase) => Boolean(purchase))
    : [];

  const lastPurchase = cliente.lastPurchase ?? purchases[purchases.length - 1]?.date ?? null;

  const contacts = Array.isArray(cliente.contacts)
    ? cliente.contacts.map((contact) => decorateContactResponse(contact)).filter(Boolean)
    : [];

  return {
    ...cliente,
    gender: cliente.gender ?? null,
    birthDate: cliente.birthDate ?? null,
    acceptsContact: Boolean(cliente.acceptsContact),
    userType: cliente.userType ?? null,
    state: cliente.state ?? null,
    interests: filteredInterests,
    purchases,
    contacts,
    lastPurchase,
    genero: cliente.gender ?? null,
    dataNascimento: cliente.birthDate ?? null,
    data_nascimento: cliente.birthDate ?? null,
    aceitaContato: Boolean(cliente.acceptsContact),
    aceita_contato: Boolean(cliente.acceptsContact),
    tipoUsuario: cliente.userType ?? null,
    tipo_usuario: cliente.userType ?? null,
    estadoCliente: cliente.state ?? null,
    estado_cliente: cliente.state ?? null,
    interesses: filteredInterests,
    compras: purchases,
    compra: purchases[purchases.length - 1] || null,
    contatos: contacts,
  };
}

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

const contatoUpdateSchema = z.object({
  completed: z.boolean({ required_error: 'Campo "completed" é obrigatório.' }),
});

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
    const decoratedClientes = paginatedClientes.map((cliente) =>
      decorateClientResponse(cliente)
    );

    res.json({
      clientes: decoratedClientes,
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
    const parsedBody = clienteCreateSchema.safeParse(normalizeClientRequestBody(req.body));
    if (!parsedBody.success) {
      return res.status(400).json({ error: extractValidationError(parsedBody.error) });
    }

    const {
      nome,
      telefone,
      email,
      cpf,
      gender,
      birthDate,
      acceptsContact,
      userType,
      interests,
      purchase,
      purchases,
    } = parsedBody.data;
    const cliente = await Promise.resolve(
      storage.createCliente({
        nome,
        telefone: telefone ?? null,
        email: email ?? null,
        cpf: cpf ?? null,
        gender: gender ?? null,
        birthDate: birthDate ?? null,
        acceptsContact: normalizeAcceptsContactInput(acceptsContact),
        userType: userType ?? null,
        interests: Array.isArray(interests) ? interests : [],
        purchase: purchase ?? null,
        purchases: purchases ?? undefined,
      })
    );

    res.status(201).json({ cliente: decorateClientResponse(cliente) });
  } catch (error) {
    handleError(res, error);
  }
});

app.put('/api/clientes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const parsedBody = clienteUpdateSchema.safeParse(normalizeClientRequestBody(req.body));
    if (!parsedBody.success) {
      return res.status(400).json({ error: extractValidationError(parsedBody.error) });
    }

    const {
      nome,
      telefone,
      email,
      cpf,
      gender,
      birthDate,
      acceptsContact,
      userType,
      interests,
      purchase,
      purchases,
    } = parsedBody.data;
    const updated = await Promise.resolve(
      storage.updateCliente(id, {
        nome,
        telefone: telefone === undefined ? undefined : telefone ?? null,
        email: email === undefined ? undefined : email ?? null,
        cpf: cpf === undefined ? undefined : cpf ?? null,
        gender: gender === undefined ? undefined : gender ?? null,
        birthDate: birthDate === undefined ? undefined : birthDate ?? null,
        acceptsContact: normalizeAcceptsContactInput(acceptsContact, { allowUndefined: true }),
        userType: userType === undefined ? undefined : userType ?? null,
        interests,
        purchase,
        purchases,
      })
    );

    if (!updated) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    res.json({ cliente: decorateClientResponse(updated) });
  } catch (error) {
    handleError(res, error);
  }
});

app.patch('/api/contatos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const parsedBody = contatoUpdateSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ error: extractValidationError(parsedBody.error) });
    }

    const { completed } = parsedBody.data;
    const result = await Promise.resolve(storage.updateContactStatus(id, completed));

    if (!result) {
      return res.status(404).json({ error: 'Contato não encontrado.' });
    }

    const { contact, cliente } = result;

    res.json({
      contato: decorateContactResponse(contact),
      cliente: decorateClientResponse(cliente),
    });
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

    const contatos = await Promise.resolve(storage.listContacts());
    const filteredContatos = contatos.filter((contato) => {
      if (!fromDate && !toDate) {
        return true;
      }

      if (!contato.contactDate) {
        return false;
      }

      const contatoDate = new Date(`${contato.contactDate}T00:00:00Z`);
      if (Number.isNaN(contatoDate.getTime())) {
        return false;
      }

      if (fromDate && contatoDate < fromDate) {
        return false;
      }

      if (toDate && contatoDate > toDate) {
        return false;
      }

      return true;
    });

    const contactEvents = filteredContatos
      .filter((contato) => contato.contactDate)
      .map((contato) => {
        const months = Number(contato.monthsOffset ?? contato.prazoMeses ?? contato.prazo_meses);
        const monthsLabel = Number.isFinite(months)
          ? `${months} ${months === 1 ? 'mês' : 'meses'}`
          : null;
        const title = monthsLabel
          ? `Contato pós-venda - ${monthsLabel}`
          : 'Contato pós-venda';
        const description = contato.completed ? 'Contato efetuado' : 'Contato pendente';

        return {
          id: `contact-${contato.id}`,
          date: contato.contactDate,
          title,
          description,
          color: '#22c55e',
          clientId: contato.clientId ?? contato.cliente_id ?? null,
          type: 'contact',
          contactId: contato.id,
          contactCompleted: Boolean(contato.completed),
          completed: Boolean(contato.completed),
          monthsOffset: contato.monthsOffset ?? null,
          purchaseId: contato.purchaseId ?? null,
          purchaseDate: contato.purchaseDate ?? null,
        };
      });

    const decoratedEventos = filteredEventos.map(toApiEvento);
    res.json({ eventos: [...decoratedEventos, ...contactEvents] });
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
