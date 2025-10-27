const USERS = [
  {
    id: 'usuario-teste',
    code: 'T',
    name: 'Usuário Teste',
    accessLevel: 1,
    role: 'Usuário',
  },
  {
    id: 'exotica',
    code: 'E',
    name: 'Exótica',
    accessLevel: 1,
    role: 'Usuário',
  },
  {
    id: 'jorel-chicuta',
    code: 'C',
    name: 'Jorel Chicuta',
    accessLevel: 1,
    role: 'Usuário',
  },
  {
    id: 'jorel-avenida',
    code: 'A',
    name: 'Jorel Avenida',
    accessLevel: 1,
    role: 'Usuário',
  },
  {
    id: 'fernando',
    code: 'F',
    name: 'Fernando',
    accessLevel: 3,
    role: 'Conta Master',
  },
  {
    id: 'rede-jorel',
    code: 'R',
    name: 'REDE JOREL',
    accessLevel: 2,
    role: 'Administrador',
  },
];

function normalizeUserId(value) {
  if (value === undefined || value === null) {
    return '';
  }

  const text = String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

  if (!text) {
    return '';
  }

  return text.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

const USERS_BY_ID = new Map(
  USERS.map((user) => {
    const normalizedId = normalizeUserId(user.id || user.name);
    return [normalizedId, { ...user, id: normalizedId }];
  })
);

const DEFAULT_USER_ID = USERS[0]?.id || '';

function findUserById(value) {
  const normalized = normalizeUserId(value);
  if (!normalized) {
    return null;
  }
  return USERS_BY_ID.get(normalized) || null;
}

module.exports = {
  USERS: Array.from(USERS_BY_ID.values()),
  DEFAULT_USER_ID,
  normalizeUserId,
  findUserById,
};
