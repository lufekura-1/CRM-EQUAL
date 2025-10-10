const events = {};
let editingEvent = null;
let editingEventOriginalDateKey = null;
let currentDetailEvent = null;
let currentClientId = '';
let currentClientData = null;

function setCurrentClient(client) {
  if (!client) {
    currentClientId = '';
    currentClientData = null;
    return;
  }
  currentClientId = client.id;
  currentClientData = client;
}

function getCurrentClientId() {
  return currentClientId;
}

function getCurrentClientData() {
  return currentClientData;
}

const USERS = [
  { id: 'exotica', code: 'E', name: 'EXOTICA', subtitle: 'Usuário 1' },
  { id: 'jorel-avenida', code: 'A', name: 'JOREL AVENIDA', subtitle: 'Usuário 2' },
  { id: 'jorel-chicuta', code: 'C', name: 'JOREL CHICUTA', subtitle: 'Usuário 3' },
  { id: 'administrador', code: 'X', name: 'ADMINISTRADOR', subtitle: 'Usuário 4' },
];

let currentUserId = USERS[0]?.id || '';

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

let currentCalendarDate = new Date();
let currentCalendarView = 'month';

function parseDateKeyToDate(dateKey) {
  if (!dateKey) {
    return null;
  }
  const normalized = String(dateKey).slice(0, 10);
  const parsed = new Date(`${normalized}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function formatPostSaleLabel(months) {
  const numeric = Number(months);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return '';
  }
  return `PV-${numeric}M`;
}

function getEventStatus(event) {
  if (!event) {
    return { key: 'pending', label: 'Pendente' };
  }

  const isContact = event.type === 'contact';
  const isCompleted = isContact
    ? Boolean(event.contactCompleted ?? event.completed)
    : Boolean(event.completed);

  if (isCompleted) {
    return { key: 'completed', label: 'Efetuado' };
  }

  const eventDate = parseDateKeyToDate(event.date ?? event.rawDate ?? event.contactDate ?? null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (eventDate && eventDate < today) {
    return { key: 'overdue', label: 'Atrasado' };
  }

  return { key: 'pending', label: 'Pendente' };
}

window.getEventStatus = getEventStatus;
window.formatPostSaleLabel = formatPostSaleLabel;

function getUsersList() {
  return USERS.map((user) => ({ ...user }));
}

function getCurrentUserIdValue() {
  return currentUserId;
}

window.getUsers = getUsersList;
window.getCurrentUserId = getCurrentUserIdValue;
