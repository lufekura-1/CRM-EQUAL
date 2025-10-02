const events = {};
let eventIdCounter = 0;
let editingEvent = null;
let editingEventOriginalDateKey = null;
let currentDetailEvent = null;
let detailAutoCloseTimeout = null;
let isDetailHovered = false;
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
