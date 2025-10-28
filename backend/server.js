const express = require('express');
const cors = require('cors');
const { z, ZodError } = require('zod');
const storageFactory = require('./src/storage');
const { PORT, STORAGE } = require('./src/config/env');
const { DEFAULT_USER_ID, findUserById, normalizeUserId } = require('./src/config/users');

const app = express();

const corsOptions = {
  origin: ["http://localhost:5500", "http://127.0.0.1:5500"],
  optionsSuccessStatus: 200,
};


app.use(cors(corsOptions));
app.use(express.json());
app.use(cors(corsOptions));
app.use(express.json());

// --- SERVE O FRONTEND (index.html, css, js) ---
const path = require('path');

// Serve os arquivos estáticos da pasta principal (onde está o index.html)
app.use(express.static(path.join(__dirname, '..')));

// Rota principal: envia o index.html da raiz
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});
// --- FIM DO BLOCO ---


const USER_ID_KEYS = [
  'userId',
  'user_id',
  'usuarioId',
  'usuario_id',
  'user',
  'usuario',
  'ownerId',
  'owner_id',
  'owner',
  'responsavelId',
  'responsavel_id',
  'responsavel',
  'responsibleId',
  'responsible_id',
  'responsible',
  'assigned_user_id',
  'assigned_user',
  'assignedUserId',
  'assignedUser',
  'responsible_user_id',
  'responsibleUserId',
  'responsibleUser',
];

function extractUserIdCandidates(req) {
  const candidates = [];
  const headerNames = ['x-user-id', 'x-user', 'x-usuario-id'];
  headerNames.forEach((headerName) => {
    const value = req.get(headerName);
    if (value !== undefined && value !== null) {
      candidates.push(value);
    }
  });

  const query = req.query && typeof req.query === 'object' ? req.query : {};
  const body = req.body && typeof req.body === 'object' ? req.body : {};

  USER_ID_KEYS.forEach((key) => {
    if (query[key] !== undefined) {
      candidates.push(query[key]);
    }
  });

  USER_ID_KEYS.forEach((key) => {
    if (body[key] !== undefined) {
      candidates.push(body[key]);
    }
  });

  return candidates;
}

function requireRequestUser(req, res) {
  const candidates = extractUserIdCandidates(req);
  const hasProvidedCandidate = candidates.some((candidate) => {
    if (candidate === undefined || candidate === null) {
      return false;
    }
    return String(candidate).trim().length > 0;
  });

  if (!hasProvidedCandidate) {
    res.status(400).json({ error: 'Usuário não informado. Envie o cabeçalho X-User-Id.' });
    return null;
  }

  for (const candidate of candidates) {
    const normalized = normalizeUserId(candidate);
    if (!normalized) {
      continue;
    }

    const user = findUserById(normalized);
    if (user) {
      const context = { ...user, normalizedId: user.id };
      req.currentUser = context;
      return context;
    }
  }

  res.status(403).json({ error: 'Usuário não autorizado.' });
  return null;
}

function resolveEntityUserId(entity, fallbackId = DEFAULT_USER_ID) {
  if (!entity || typeof entity !== 'object') {
    return findUserById(fallbackId)?.id || DEFAULT_USER_ID;
  }

  for (const key of USER_ID_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(entity, key)) {
      continue;
    }

    const normalized = normalizeUserId(entity[key]);
    if (!normalized) {
      continue;
    }

    const user = findUserById(normalized);
    if (user) {
      return user.id;
    }
  }

  const normalizedFallback = normalizeUserId(fallbackId);
  const fallbackUser = findUserById(normalizedFallback);
  return fallbackUser ? fallbackUser.id : DEFAULT_USER_ID;
}

function assignUserId(entity, userId) {
  if (!entity || typeof entity !== 'object') {
    return entity;
  }

  const normalized = normalizeUserId(userId);
  const resolvedUser = findUserById(normalized);
  const finalUserId = resolvedUser ? resolvedUser.id : DEFAULT_USER_ID;

  USER_ID_KEYS.forEach((key) => {
    entity[key] = finalUserId;
  });

  return entity;
}

function requireRequestStorage(req, res) {
  const currentUser = requireRequestUser(req, res);
  if (!currentUser) {
    return null;
  }

  if (!req.currentStorage) {
    req.currentStorage = storageFactory.forUser(currentUser.id);
  }

  return req.currentStorage;
}


function toApiEvento(evento) {
  return {
    id: evento.id,
    date: evento.data,
    title: evento.titulo,
    description: evento.descricao,
    color: evento.cor,
    clientId: evento.cliente_id,
    completed: Boolean(evento.completed),
    createdAt: evento.created_at,
    userId: evento.usuario_id ?? evento.user_id ?? null,
    user_id: evento.usuario_id ?? evento.user_id ?? null,
    usuarioId: evento.usuario_id ?? evento.user_id ?? null,
    usuario_id: evento.usuario_id ?? evento.user_id ?? null,
    user: evento.usuario_id ?? evento.user_id ?? null,
    usuario: evento.usuario_id ?? evento.user_id ?? null,
    ownerId: evento.usuario_id ?? evento.user_id ?? null,
    owner_id: evento.usuario_id ?? evento.user_id ?? null,
    responsavelId: evento.usuario_id ?? evento.user_id ?? null,
    responsavel_id: evento.usuario_id ?? evento.user_id ?? null,
    responsavel: evento.usuario_id ?? evento.user_id ?? null,
    responsibleId: evento.usuario_id ?? evento.user_id ?? null,
    responsible_id: evento.usuario_id ?? evento.user_id ?? null,
    responsible: evento.usuario_id ?? evento.user_id ?? null,
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
    completed:
      payload.completed === undefined
        ? undefined
        : payload.completed
          ? 1
          : 0,
    usuario_id: normalize(
      payload.userId ??
        payload.user_id ??
        payload.usuarioId ??
        payload.usuario_id ??
        payload.usuario ??
        payload.user ??
        payload.ownerId ??
        payload.owner_id ??
        payload.responsavelId ??
        payload.responsavel_id ??
        payload.responsavel ??
        payload.responsibleId ??
        payload.responsible_id ??
        payload.responsible ??
        null
    ),
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

const CONTACT_STATUS_LABELS = {
  completed: 'Efetuado',
  overdue: 'Atrasado',
  pending: 'Pendente',
};

function normalizeDateOnly(value) {
  if (!value) {
    return null;
  }

  const text = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}

function resolveContactStatus(contact) {
  if (!contact) {
    return { key: 'pending', label: CONTACT_STATUS_LABELS.pending };
  }

  const candidateKey = contact.status ?? contact.statusKey ?? contact.situacao ?? null;
  if (candidateKey && CONTACT_STATUS_LABELS[candidateKey]) {
    return { key: candidateKey, label: CONTACT_STATUS_LABELS[candidateKey] };
  }

  const completed = Boolean(contact.completed ?? contact.efetuado);
  if (completed) {
    return { key: 'completed', label: CONTACT_STATUS_LABELS.completed };
  }

  const contactDate = normalizeDateOnly(contact.contactDate ?? contact.data_contato ?? null);
  if (contactDate) {
    const todayIso = new Date().toISOString().slice(0, 10);
    if (contactDate < todayIso) {
      return { key: 'overdue', label: CONTACT_STATUS_LABELS.overdue };
    }
  }

  return { key: 'pending', label: CONTACT_STATUS_LABELS.pending };
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
  userId: normalizeNullableStringSchema,
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
      value.userId !== undefined ||
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
  if (normalized.user_id !== undefined && normalized.userId === undefined) {
    normalized.userId = normalized.user_id;
  }
  if (normalized.usuarioId !== undefined && normalized.userId === undefined) {
    normalized.userId = normalized.usuarioId;
  }
  if (normalized['usuario_id'] !== undefined && normalized.userId === undefined) {
    normalized.userId = normalized['usuario_id'];
  }
  if (normalized.usuario !== undefined && normalized.userId === undefined) {
    normalized.userId = normalized.usuario;
  }
  if (normalized.user !== undefined && normalized.userId === undefined) {
    normalized.userId = normalized.user;
  }
  if (normalized.ownerId !== undefined && normalized.userId === undefined) {
    normalized.userId = normalized.ownerId;
  }
  if (normalized['owner_id'] !== undefined && normalized.userId === undefined) {
    normalized.userId = normalized['owner_id'];
  }
  if (normalized.responsavelId !== undefined && normalized.userId === undefined) {
    normalized.userId = normalized.responsavelId;
  }
  if (normalized['responsavel_id'] !== undefined && normalized.userId === undefined) {
    normalized.userId = normalized['responsavel_id'];
  }
  if (normalized.responsavel !== undefined && normalized.userId === undefined) {
    normalized.userId = normalized.responsavel;
  }
  if (normalized.responsibleId !== undefined && normalized.userId === undefined) {
    normalized.userId = normalized.responsibleId;
  }
  if (normalized['responsible_id'] !== undefined && normalized.userId === undefined) {
    normalized.userId = normalized['responsible_id'];
  }
  if (normalized.responsible !== undefined && normalized.userId === undefined) {
    normalized.userId = normalized.responsible;
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

function decoratePurchaseResponse(purchase, fallbackUserId = DEFAULT_USER_ID) {
  if (!purchase) {
    return null;
  }

  const dioptry = cloneDioptry(purchase.dioptry);

  const contacts = Array.isArray(purchase.contacts)
    ? purchase.contacts
        .map((contact) => decorateContactResponse(contact, fallbackUserId))
        .filter(Boolean)
    : [];

  return {
    ...purchase,
    dioptry,
    detail: purchase.detail ?? null,
    purchaseDetail: purchase.detail ?? null,
    detalheCompra: purchase.detail ?? null,
    detalhe_compra: purchase.detail ?? null,
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

function decorateContactResponse(contact, fallbackUserId = DEFAULT_USER_ID) {
  if (!contact) {
    return null;
  }

  const completed = Boolean(contact.completed);
  const statusInfo = resolveContactStatus(contact);
  const contactUserId = resolveEntityUserId(contact, fallbackUserId);

  return {
    ...contact,
    completed,
    contactDate: contact.contactDate ?? null,
    purchaseDate: contact.purchaseDate ?? null,
    monthsOffset: contact.monthsOffset ?? null,
    purchaseDetail: contact.purchaseDetail ?? null,
    detalheCompra: contact.purchaseDetail ?? null,
    detalhe_compra: contact.purchaseDetail ?? null,
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
    status: statusInfo.key,
    statusLabel: statusInfo.label,
    status_label: statusInfo.label,
    userId: contactUserId ?? null,
    user_id: contactUserId ?? null,
    usuarioId: contactUserId ?? null,
    usuario_id: contactUserId ?? null,
    user: contactUserId ?? null,
    usuario: contactUserId ?? null,
    ownerId: contactUserId ?? null,
    owner_id: contactUserId ?? null,
    owner: contactUserId ?? null,
    responsavelId: contactUserId ?? null,
    responsavel_id: contactUserId ?? null,
    responsavel: contactUserId ?? null,
    responsibleId: contactUserId ?? null,
    responsible_id: contactUserId ?? null,
    responsible: contactUserId ?? null,
    assigned_user_id: contactUserId ?? null,
    assigned_user: contactUserId ?? null,
  };
}

function decorateClientResponse(cliente, fallbackUserId = DEFAULT_USER_ID) {
  if (!cliente) {
    return null;
  }

  const clientUserId = resolveEntityUserId(cliente, fallbackUserId);
  const interests = Array.isArray(cliente.interests)
    ? cliente.interests.map((item) => (item === undefined || item === null ? null : String(item).trim()))
    : [];
  const filteredInterests = interests.filter((item) => item && item.length > 0);

  const purchases = Array.isArray(cliente.purchases)
    ? cliente.purchases
        .map((purchase) => decoratePurchaseResponse(purchase, clientUserId))
        .filter((purchase) => Boolean(purchase))
    : [];

  const lastPurchase = cliente.lastPurchase ?? purchases[purchases.length - 1]?.date ?? null;

  const contacts = Array.isArray(cliente.contacts)
    ? cliente.contacts
        .map((contact) => decorateContactResponse(contact, clientUserId))
        .filter(Boolean)
    : [];

  return {
    ...cliente,
    userId: clientUserId ?? null,
    user_id: clientUserId ?? null,
    usuarioId: clientUserId ?? null,
    usuario_id: clientUserId ?? null,
    user: clientUserId ?? null,
    usuario: clientUserId ?? null,
    ownerId: clientUserId ?? null,
    owner_id: clientUserId ?? null,
    responsavelId: clientUserId ?? null,
    responsavel_id: clientUserId ?? null,
    responsavel: clientUserId ?? null,
    responsibleId: clientUserId ?? null,
    responsible_id: clientUserId ?? null,
    responsible: clientUserId ?? null,
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
  userId: normalizeNullableStringSchema,
  completed: optionalBooleanSchema.transform((value) => {
    if (value === undefined) {
      return false;
    }
    return Boolean(value);
  }),
});

const eventoUpdateSchema = eventoCreateSchema
  .extend({ completed: optionalBooleanSchema })
  .partial()
  .refine(
    (value) =>
      value.date !== undefined ||
      value.title !== undefined ||
      value.description !== undefined ||
      value.color !== undefined ||
      value.clientId !== undefined ||
      value.userId !== undefined ||
      value.completed !== undefined,
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
  const storage = requireRequestStorage(req, res);
  const currentUser = req.currentUser;
  if (!storage || !currentUser) {
    return;
  }

  try {
    const parsedQuery = clientesQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      return res.status(400).json({ error: extractValidationError(parsedQuery.error) });
    }

    const { q, page: rawPage } = parsedQuery.data;
    const page = rawPage ?? 1;

    const clientes = await Promise.resolve(storage.listClientes());
    const clientesForUser = clientes
      .map((cliente) => {
        const resolvedUserId = resolveEntityUserId(cliente, currentUser.id);
        if (resolvedUserId !== currentUser.id) {
          return null;
        }

        assignUserId(cliente, resolvedUserId);
        return cliente;
      })
      .filter(Boolean);
    const filteredClientes =
      q === undefined
        ? clientesForUser
        : clientesForUser.filter((cliente) => {
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
      decorateClientResponse(cliente, currentUser.id)
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
  const storage = requireRequestStorage(req, res);
  const currentUser = req.currentUser;
  if (!storage || !currentUser) {
    return;
  }

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
        userId: currentUser.id,
        interests: Array.isArray(interests) ? interests : [],
        purchase: purchase ?? null,
        purchases: purchases ?? undefined,
      })
    );

    assignUserId(cliente, currentUser.id);

    res.status(201).json({ cliente: decorateClientResponse(cliente, currentUser.id) });
  } catch (error) {
    handleError(res, error);
  }
});

app.put('/api/clientes/:id', async (req, res) => {
  const storage = requireRequestStorage(req, res);
  const currentUser = req.currentUser;
  if (!storage || !currentUser) {
    return;
  }

  try {
    const { id } = req.params;
    const parsedBody = clienteUpdateSchema.safeParse(normalizeClientRequestBody(req.body));
    if (!parsedBody.success) {
      return res.status(400).json({ error: extractValidationError(parsedBody.error) });
    }

    const existing = await Promise.resolve(storage.getCliente(id));
    if (!existing) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    const ownerId = resolveEntityUserId(existing, currentUser.id);
    if (ownerId !== currentUser.id) {
      return res.status(403).json({ error: 'Você não tem permissão para alterar este cliente.' });
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
        userId: currentUser.id,
      })
    );

    if (!updated) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    assignUserId(updated, currentUser.id);

    res.json({ cliente: decorateClientResponse(updated, currentUser.id) });
  } catch (error) {
    handleError(res, error);
  }
});

app.patch('/api/contatos/:id', async (req, res) => {
  const storage = requireRequestStorage(req, res);
  const currentUser = req.currentUser;
  if (!storage || !currentUser) {
    return;
  }

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
    const ownerId = resolveEntityUserId(cliente, currentUser.id);
    if (ownerId !== currentUser.id) {
      return res.status(403).json({ error: 'Você não tem permissão para atualizar este contato.' });
    }

    assignUserId(cliente, ownerId);
    assignUserId(contact, ownerId);

    res.json({
      contato: decorateContactResponse(contact, ownerId),
      cliente: decorateClientResponse(cliente, ownerId),
    });
  } catch (error) {
    handleError(res, error);
  }
});

app.delete('/api/clientes/:id', async (req, res) => {
  const storage = requireRequestStorage(req, res);
  const currentUser = req.currentUser;
  if (!storage || !currentUser) {
    return;
  }

  try {
    const { id } = req.params;
    const existing = await Promise.resolve(storage.getCliente(id));
    if (!existing) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    const ownerId = resolveEntityUserId(existing, currentUser.id);
    if (ownerId !== currentUser.id) {
      return res.status(403).json({ error: 'Você não tem permissão para remover este cliente.' });
    }

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
  const storage = requireRequestStorage(req, res);
  const currentUser = req.currentUser;
  if (!storage || !currentUser) {
    return;
  }

  try {
    const parsedQuery = eventosQuerySchema.safeParse(req.query);
    if (!parsedQuery.success) {
      return res.status(400).json({ error: extractValidationError(parsedQuery.error) });
    }

    const { from, to } = parsedQuery.data;
    const fromDate = from ? new Date(`${from}T00:00:00.000Z`) : null;
    const toDate = to ? new Date(`${to}T23:59:59.999Z`) : null;

    const [eventos, contatos, clientes] = await Promise.all([
      Promise.resolve(storage.listEventos()),
      Promise.resolve(storage.listContacts()),
      Promise.resolve(storage.listClientes()),
    ]);

    const clientesForUser = clientes
      .map((cliente) => {
        const resolvedUserId = resolveEntityUserId(cliente, currentUser.id);
        if (resolvedUserId !== currentUser.id) {
          return null;
        }

        assignUserId(cliente, resolvedUserId);
        return cliente;
      })
      .filter(Boolean);

    const clientMap = new Map();
    const purchaseMap = new Map();

    clientesForUser.forEach((cliente) => {
      const clientId = cliente?.id ?? cliente?.cliente_id;
      if (clientId !== undefined && clientId !== null) {
        const numericId = Number(clientId);
        if (!Number.isNaN(numericId)) {
          clientMap.set(numericId, cliente);
        }
      }

      if (Array.isArray(cliente?.purchases)) {
        cliente.purchases.forEach((purchase) => {
          if (purchase?.id === undefined || purchase?.id === null) {
            return;
          }
          const numericId = Number(purchase.id);
          if (!Number.isNaN(numericId)) {
            purchaseMap.set(numericId, { ...purchase, clientId: cliente?.id ?? cliente?.cliente_id ?? null });
          }
        });
      }
    });

    const eventosForUser = eventos
      .map((evento) => {
        const resolvedUserId = resolveEntityUserId(evento, currentUser.id);
        if (resolvedUserId !== currentUser.id) {
          return null;
        }

        assignUserId(evento, resolvedUserId);
        return evento;
      })
      .filter(Boolean);

    const filteredEventos = eventosForUser.filter((evento) => {
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

    const contatosForUser = contatos
      .map((contato) => {
        const clientId = contato?.clientId ?? contato?.cliente_id ?? null;
        const numericClientId = clientId === null ? null : Number(clientId);
        if (numericClientId === null || Number.isNaN(numericClientId)) {
          return null;
        }

        if (!clientMap.has(numericClientId)) {
          return null;
        }

        const normalizedContact = { ...contato, clientId: numericClientId };
        assignUserId(normalizedContact, currentUser.id);
        return normalizedContact;
      })
      .filter(Boolean);

    const filteredContatos = contatosForUser.filter((contato) => {
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
        const statusInfo = resolveContactStatus(contato);
        const description =
          statusInfo.key === 'completed'
            ? 'Contato efetuado'
            : statusInfo.key === 'overdue'
              ? 'Contato atrasado'
              : 'Contato pendente';
        const client = clientMap.get(Number(contato.clientId)) || null;
        const purchase =
          contato.purchaseId !== undefined && contato.purchaseId !== null
            ? purchaseMap.get(Number(contato.purchaseId)) || null
            : null;
        const purchaseDate = contato.purchaseDate ?? purchase?.date ?? null;
        const clientName = client?.nome ?? client?.name ?? null;
        const clientPhone = client?.telefone ?? client?.phone ?? null;
        const purchaseFrame = purchase?.frame ?? purchase?.armacao ?? '';
        const purchaseLens = purchase?.lens ?? purchase?.lente ?? '';
        const purchaseDetail =
          contato.purchaseDetail ??
          purchase?.detail ??
          purchase?.purchaseDetail ??
          purchase?.detalhe_compra ??
          null;

        const event = {
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
          status: statusInfo.key,
          statusLabel: statusInfo.label,
          monthsOffset: contato.monthsOffset ?? null,
          contactMonths: Number.isFinite(months) ? months : null,
          purchaseId: contato.purchaseId ?? null,
          purchaseDate,
          clientName,
          clientPhone,
          purchaseFrame,
          purchaseLens,
          purchaseDetail,
        };

        assignUserId(event, currentUser.id);
        return event;
      });

    const decoratedEventos = filteredEventos.map((evento) => {
      const base = toApiEvento(evento);
      const client =
        base.clientId !== undefined && base.clientId !== null
          ? clientMap.get(Number(base.clientId))
          : null;

      return {
        ...base,
        clientName: client?.nome ?? client?.name ?? null,
        clientPhone: client?.telefone ?? client?.phone ?? null,
      };
    });
    res.json({ eventos: [...decoratedEventos, ...contactEvents] });
  } catch (error) {
    handleError(res, error);
  }
});

app.post('/api/eventos', async (req, res) => {
  const storage = requireRequestStorage(req, res);
  const currentUser = req.currentUser;
  if (!storage || !currentUser) {
    return;
  }

  try {
    const parsedBody = eventoCreateSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ error: extractValidationError(parsedBody.error) });
    }

    const { date, title, description, color, clientId, completed } = parsedBody.data;

    if (clientId !== undefined && clientId !== null) {
      const cliente = await Promise.resolve(storage.getCliente(clientId));
      if (!cliente) {
        return res.status(404).json({ error: 'Cliente não encontrado.' });
      }

      const ownerId = resolveEntityUserId(cliente, currentUser.id);
      if (ownerId !== currentUser.id) {
        return res
          .status(403)
          .json({ error: 'Você não tem permissão para vincular este cliente ao evento.' });
      }
    }

    const created = await Promise.resolve(
      storage.createEvento(
        fromApiEvento(
          {
            date,
            title,
            description: description ?? null,
            color: color ?? null,
            clientId: clientId ?? null,
            completed,
            userId: currentUser.id,
          },
          { defaultNull: true }
        )
      )
    );

    assignUserId(created, currentUser.id);

    res.status(201).json({ evento: toApiEvento(created) });
  } catch (error) {
    handleError(res, error);
  }
});

app.put('/api/eventos/:id', async (req, res) => {
  const storage = requireRequestStorage(req, res);
  const currentUser = req.currentUser;
  if (!storage || !currentUser) {
    return;
  }

  const { id } = req.params;

  try {
    const parsedBody = eventoUpdateSchema.safeParse(req.body);
    if (!parsedBody.success) {
      return res.status(400).json({ error: extractValidationError(parsedBody.error) });
    }

    const existing = await Promise.resolve(storage.getEvento(id));
    if (!existing) {
      return res.status(404).json({ error: 'Evento não encontrado.' });
    }

    const ownerId = resolveEntityUserId(existing, currentUser.id);
    if (ownerId !== currentUser.id) {
      return res.status(403).json({ error: 'Você não tem permissão para alterar este evento.' });
    }

    const { date, title, description, color, clientId, completed } = parsedBody.data;

    if (clientId !== undefined && clientId !== null) {
      const cliente = await Promise.resolve(storage.getCliente(clientId));
      if (!cliente) {
        return res.status(404).json({ error: 'Cliente não encontrado.' });
      }

      const clientOwnerId = resolveEntityUserId(cliente, currentUser.id);
      if (clientOwnerId !== currentUser.id) {
        return res
          .status(403)
          .json({ error: 'Você não tem permissão para vincular este cliente ao evento.' });
      }
    }

    const updated = await Promise.resolve(
      storage.updateEvento(
        id,
        fromApiEvento({ date, title, description, color, clientId, completed, userId: currentUser.id })
      )
    );

    if (!updated) {
      return res.status(404).json({ error: 'Evento não encontrado.' });
    }

    assignUserId(updated, currentUser.id);

    res.json({ evento: toApiEvento(updated) });
  } catch (error) {
    handleError(res, error);
  }
});

app.delete('/api/eventos/:id', async (req, res) => {
  const storage = requireRequestStorage(req, res);
  const currentUser = req.currentUser;
  if (!storage || !currentUser) {
    return;
  }

  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: 'O identificador do evento é obrigatório.' });
  }

  try {
    const existing = await Promise.resolve(storage.getEvento(id));
    if (!existing) {
      return res.status(404).json({ error: 'Evento não encontrado.' });
    }

    const ownerId = resolveEntityUserId(existing, currentUser.id);
    if (ownerId !== currentUser.id) {
      return res.status(403).json({ error: 'Você não tem permissão para remover este evento.' });
    }

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
