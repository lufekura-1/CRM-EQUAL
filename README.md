# CRM Equal

Aplicação de CRM com foco em calendário e gerenciamento de contatos. O projeto agora está dividido em frontend e backend para facilitar a escalabilidade e a integração com o Google Sheets.

## Estrutura do projeto

```
frontend/
  index.html
  styles.css
  scripts/
backend/
  server.js
  services/googleSheetsService.js
  package.json
```

- **frontend/**: interface web em HTML, CSS e JavaScript puro.
- **backend/**: API Node.js responsável pela sincronização com o Google Sheets.

## Frontend

Para visualizar a interface basta servir a pasta `frontend` em um servidor estático (por exemplo, com a extensão "Live Server" do VS Code) ou abrir `frontend/index.html` diretamente no navegador.

### Novidades

- Menu lateral reorganizado com seletor de usuário e acesso rápido à página de configuração.
- Modal centralizado para trocar de usuário com confirmação explícita.
- Nova página "Configuração" acessível a todos os usuários.

## Backend

O backend expõe endpoints REST para listar, criar, atualizar e remover eventos armazenados em uma planilha do Google Sheets.

### Configuração

1. Crie um projeto no Google Cloud e gere uma credencial de **Service Account** com acesso ao Google Sheets.
2. Compartilhe a planilha desejada com o e-mail da service account.
3. Crie um arquivo `.env` dentro de `backend/` com as variáveis abaixo:

```
GOOGLE_SERVICE_ACCOUNT_EMAIL=seu-email@seu-projeto.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_SPREADSHEET_ID=ID_DA_PLANILHA
GOOGLE_SHEETS_WORKSHEET_NAME=Eventos
PORT=4000
```

> Observação: mantenha as quebras de linha da chave privada utilizando `\n` como no exemplo.

### Execução

```bash
cd backend
npm install
npm run dev
```

A API ficará disponível em `http://localhost:4000`. Os endpoints principais são:

- `GET /api/health` — verificação simples da integração.
- `GET /api/events` — lista eventos existentes.
- `POST /api/events` — adiciona um evento.
- `PUT /api/events/:id` — atualiza um evento.
- `DELETE /api/events/:id` — remove um evento.

## Integração futura

O frontend pode consumir os endpoints acima para persistir eventos criados na interface. O serviço do Google Sheets garante a criação automática do cabeçalho da planilha e oferece identificadores únicos para cada registro.
