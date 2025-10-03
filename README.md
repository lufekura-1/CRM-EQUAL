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

O backend expõe endpoints REST para gerenciar clientes e eventos. Os dados podem ser persistidos tanto em SQLite (padrão) quanto no Google Sheets, dependendo da configuração aplicada.

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
cp .env.example .env
npm install
npm run dev
```

A API ficará disponível em `http://localhost:4000`. Os endpoints principais são:

- `GET /api/health` — verificação simples da integração.
- `GET /api/clientes` — lista clientes cadastrados, com suporte a `?q=` (busca) e `?page=` (paginação).
- `POST /api/clientes` — adiciona um novo cliente.
- `PUT /api/clientes/:id` — atualiza os dados de um cliente existente.
- `DELETE /api/clientes/:id` — remove um cliente.
- `GET /api/eventos` — lista eventos existentes, permitindo filtrar por intervalo de datas com `?from=YYYY-MM-DD&to=YYYY-MM-DD`.
- `POST /api/eventos` — adiciona um evento.
- `PUT /api/eventos/:id` — atualiza um evento.
- `DELETE /api/eventos/:id` — remove um evento.

### Exemplos com `curl`

```bash
# Lista a segunda página de clientes contendo "ana" no nome, telefone ou e-mail.
curl "http://localhost:4000/api/clientes?q=ana&page=2"

# Cria um cliente
curl -X POST "http://localhost:4000/api/clientes" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Ana Souza",
    "telefone": "+55 11 99999-9999",
    "email": "ana@example.com"
  }'

# Atualiza apenas o telefone de um cliente
curl -X PUT "http://localhost:4000/api/clientes/1" \
  -H "Content-Type: application/json" \
  -d '{ "telefone": "+55 11 98888-8888" }'

# Busca eventos entre duas datas (intervalo inclusivo)
curl "http://localhost:4000/api/eventos?from=2024-01-01&to=2024-12-31"

# Cria um evento associado a um cliente
curl -X POST "http://localhost:4000/api/eventos" \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2024-06-15",
    "title": "Reunião com Ana",
    "description": "Apresentação do produto",
    "clientId": 1
  }'

# Remove um evento
curl -X DELETE "http://localhost:4000/api/eventos/3"
```

## Integração futura

O frontend pode consumir os endpoints acima para persistir eventos criados na interface. O serviço do Google Sheets garante a criação automática do cabeçalho da planilha e oferece identificadores únicos para cada registro.
