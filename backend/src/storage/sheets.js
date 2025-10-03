const GoogleSheetsService = require('../../services/googleSheetsService');

const sheetsService = new GoogleSheetsService({
  spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
  worksheetName: process.env.GOOGLE_SHEETS_WORKSHEET_NAME || 'Eventos',
});

function unsupportedClientes() {
  const error = new Error('Operação não suportada para o adaptador Google Sheets.');
  error.code = 'NOT_IMPLEMENTED';
  throw error;
}

function mapSheetEventToStorage(event) {
  return {
    id: event.id,
    data: event.date,
    titulo: event.title,
    descricao: event.description,
    cor: event.color ?? null,
    cliente_id: event.userId ?? null,
    created_at: event.createdAt ?? null,
  };
}

function mapStorageEventToSheet(event) {
  return {
    id: event.id,
    date: event.data,
    title: event.titulo,
    description: event.descricao,
    userId: event.cliente_id,
    color: event.cor,
  };
}

module.exports = {
  async listClientes() {
    return unsupportedClientes();
  },
  async createCliente() {
    return unsupportedClientes();
  },
  async updateCliente() {
    return unsupportedClientes();
  },
  async deleteCliente() {
    return unsupportedClientes();
  },
  async listEventos() {
    const events = await sheetsService.listEvents();
    return events.map(mapSheetEventToStorage);
  },
  async createEvento(evento) {
    const created = await sheetsService.appendEvent(mapStorageEventToSheet(evento));
    return mapSheetEventToStorage(created);
  },
  async updateEvento(id, evento) {
    const updated = await sheetsService.updateEvent(id, mapStorageEventToSheet(evento));
    return mapSheetEventToStorage(updated);
  },
  async deleteEvento(id) {
    await sheetsService.deleteEvent(id);
    return true;
  },
};
