const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const GoogleSheetsService = require('./services/googleSheetsService');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const sheetsService = new GoogleSheetsService({
  spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID,
  worksheetName: process.env.GOOGLE_SHEETS_WORKSHEET_NAME || 'Eventos',
});

function handleIntegrationError(res, error) {
  const status = error.code === 'NOT_CONFIGURED' ? 503 : 500;
  res.status(status).json({
    error: error.message || 'Erro inesperado ao integrar com o Google Sheets.',
    details: error.details || null,
  });
}

app.get('/api/health', async (req, res) => {
  res.json({
    status: 'ok',
    googleSheetsConfigured: sheetsService.isConfigured(),
  });
});

app.get('/api/events', async (req, res) => {
  try {
    const events = await sheetsService.listEvents();
    res.json({ events });
  } catch (error) {
    handleIntegrationError(res, error);
  }
});

app.post('/api/events', async (req, res) => {
  const { date, title, description = '', userId = '' } = req.body || {};

  if (!date || !title) {
    return res.status(400).json({
      error: 'Campos "date" e "title" são obrigatórios.',
    });
  }

  try {
    const createdEvent = await sheetsService.appendEvent({
      date,
      title,
      description,
      userId,
    });

    res.status(201).json({ event: createdEvent });
  } catch (error) {
    handleIntegrationError(res, error);
  }
});

app.put('/api/events/:id', async (req, res) => {
  const { id } = req.params;
  const { date, title, description = '', userId = '' } = req.body || {};

  if (!id) {
    return res.status(400).json({ error: 'O identificador do evento é obrigatório.' });
  }

  try {
    const updatedEvent = await sheetsService.updateEvent(id, {
      date,
      title,
      description,
      userId,
    });

    res.json({ event: updatedEvent });
  } catch (error) {
    handleIntegrationError(res, error);
  }
});

app.delete('/api/events/:id', async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: 'O identificador do evento é obrigatório.' });
  }

  try {
    await sheetsService.deleteEvent(id);
    res.status(204).send();
  } catch (error) {
    handleIntegrationError(res, error);
  }
});

app.listen(PORT, () => {
  /* eslint-disable no-console */
  console.log(`Servidor iniciado na porta ${PORT}`);
  /* eslint-enable no-console */
});
