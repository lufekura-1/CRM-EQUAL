const { google } = require('googleapis');

const DEFAULT_HEADERS = ['ID', 'DATE', 'TITLE', 'DESCRIPTION', 'USER_ID'];

class GoogleSheetsService {
  constructor({ spreadsheetId, worksheetName }) {
    this.spreadsheetId = spreadsheetId;
    this.worksheetName = worksheetName;
    this.jwtClient = null;
    this.sheetsApi = null;
    this.headers = DEFAULT_HEADERS;
  }

  isConfigured() {
    return Boolean(
      this.spreadsheetId &&
      this.worksheetName &&
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
      process.env.GOOGLE_PRIVATE_KEY
    );
  }

  createConfigurationError() {
    const error = new Error(
      'Integração com o Google Sheets não está configurada corretamente.'
    );
    error.code = 'NOT_CONFIGURED';
    error.details = {
      spreadsheetId: Boolean(this.spreadsheetId),
      worksheetName: Boolean(this.worksheetName),
      serviceAccountEmail: Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL),
      privateKey: Boolean(process.env.GOOGLE_PRIVATE_KEY),
    };
    return error;
  }

  async getSheetsClient() {
    if (!this.isConfigured()) {
      throw this.createConfigurationError();
    }

    if (!this.jwtClient) {
      const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');
      this.jwtClient = new google.auth.JWT(
        process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
        null,
        privateKey,
        ['https://www.googleapis.com/auth/spreadsheets']
      );
    }

    if (!this.sheetsApi) {
      await this.jwtClient.authorize();
      this.sheetsApi = google.sheets({ version: 'v4', auth: this.jwtClient });
    }

    return this.sheetsApi;
  }

  getSheetRange(fromRow = 1) {
    const lastColumn = String.fromCharCode(64 + this.headers.length);
    return `${this.worksheetName}!A${fromRow}:${lastColumn}`;
  }

  async ensureHeaderRow(sheets) {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `${this.worksheetName}!1:1`,
    });

    const headerRow = response.data.values?.[0] || [];
    const headerIsMissing = this.headers.some(
      (header, index) => (headerRow[index] || '').toUpperCase() !== header
    );

    if (headerIsMissing) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: `${this.worksheetName}!A1:${String.fromCharCode(
          64 + this.headers.length
        )}1`,
        valueInputOption: 'RAW',
        requestBody: {
          values: [this.headers],
        },
      });
    }
  }

  mapRowToEvent(row) {
    const [id, date, title, description, userId] = row;
    return {
      id,
      date,
      title,
      description,
      userId,
    };
  }

  mapEventToRow(event) {
    return [event.id, event.date, event.title, event.description, event.userId];
  }

  async listEvents() {
    const sheets = await this.getSheetsClient();
    await this.ensureHeaderRow(sheets);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: this.getSheetRange(2),
    });

    const rows = response.data.values || [];
    return rows
      .filter((row) => row && row.length)
      .map((row) => this.mapRowToEvent(row));
  }

  generateEventId() {
    return `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  }

  async appendEvent(event) {
    const sheets = await this.getSheetsClient();
    await this.ensureHeaderRow(sheets);

    const newEvent = {
      ...event,
      id: event.id || this.generateEventId(),
    };

    await sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: this.getSheetRange(),
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [this.mapEventToRow(newEvent)],
      },
    });

    return newEvent;
  }

  async findRowIndexById(eventId) {
    const sheets = await this.getSheetsClient();
    await this.ensureHeaderRow(sheets);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: this.getSheetRange(2),
    });

    const rows = response.data.values || [];
    const index = rows.findIndex((row) => row[0] === eventId);

    return index === -1 ? null : index + 2; // +2 because rows start at 2
  }

  async updateEvent(eventId, eventData) {
    const rowIndex = await this.findRowIndexById(eventId);
    if (!rowIndex) {
      const error = new Error('Evento não encontrado para atualização.');
      error.code = 'NOT_FOUND';
      throw error;
    }

    const sheets = await this.getSheetsClient();
    const updatedEvent = {
      ...eventData,
      id: eventId,
    };

    await sheets.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `${this.worksheetName}!A${rowIndex}:E${rowIndex}`,
      valueInputOption: 'RAW',
      requestBody: {
        values: [this.mapEventToRow(updatedEvent)],
      },
    });

    return updatedEvent;
  }

  async deleteEvent(eventId) {
    const rowIndex = await this.findRowIndexById(eventId);
    if (!rowIndex) {
      const error = new Error('Evento não encontrado para exclusão.');
      error.code = 'NOT_FOUND';
      throw error;
    }

    const sheets = await this.getSheetsClient();

    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: this.spreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId: await this.resolveSheetId(sheets),
                dimension: 'ROWS',
                startIndex: rowIndex - 1,
                endIndex: rowIndex,
              },
            },
          },
        ],
      },
    });
  }

  async resolveSheetId(sheets) {
    if (this.sheetId) {
      return this.sheetId;
    }

    const response = await sheets.spreadsheets.get({
      spreadsheetId: this.spreadsheetId,
    });

    const sheet = response.data.sheets?.find(
      (item) => item.properties?.title === this.worksheetName
    );

    if (!sheet) {
      const error = new Error('A aba informada não foi encontrada na planilha.');
      error.code = 'NOT_FOUND';
      throw error;
    }

    this.sheetId = sheet.properties.sheetId;
    return this.sheetId;
  }
}

module.exports = GoogleSheetsService;
