const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const DEFAULT_PORT = 4000;
const DEFAULT_STORAGE = 'sqlite';
const DEFAULT_SQLITE_DB_PATH = '../data/crm.db';

const rawPort = process.env.PORT;
const rawStorage = process.env.STORAGE;
const rawSqlitePath = process.env.SQLITE_DB_PATH || DEFAULT_SQLITE_DB_PATH;

const PORT = rawPort ? Number(rawPort) : DEFAULT_PORT;
const STORAGE = (rawStorage || DEFAULT_STORAGE).toLowerCase();
const SQLITE_DB_PATH = path.isAbsolute(rawSqlitePath)
  ? rawSqlitePath
  : path.resolve(__dirname, '../../', rawSqlitePath);

module.exports = {
  PORT,
  STORAGE,
  SQLITE_DB_PATH,
};
