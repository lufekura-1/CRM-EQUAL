const events = {};
let eventIdCounter = 0;
let editingEvent = null;
let editingEventOriginalDateKey = null;
let currentDetailEvent = null;
let detailAutoCloseTimeout = null;
let isDetailHovered = false;

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
