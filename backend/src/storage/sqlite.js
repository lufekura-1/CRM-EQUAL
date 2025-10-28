const path = require('path');
const createSqliteAdapter = require('./sqlite-adapter');
const { SQLITE_DB_PATH } = require('../config/env');
const { normalizeUserId, DEFAULT_USER_ID } = require('../config/users');

const adapterCache = new Map();

function resolveDatabasePath(userId) {
  const basePath = SQLITE_DB_PATH;
  const directory = path.dirname(basePath);
  const extension = path.extname(basePath) || '.db';
  const baseName = path.basename(basePath, extension);
  const normalizedUserId = normalizeUserId(userId) || normalizeUserId(DEFAULT_USER_ID) || 'default';
  const filename = `${baseName}.${normalizedUserId}${extension}`;
  return path.join(directory, filename);
}

function getAdapterForUser(userId) {
  const normalizedId = normalizeUserId(userId) || normalizeUserId(DEFAULT_USER_ID) || 'default';
  if (adapterCache.has(normalizedId)) {
    return adapterCache.get(normalizedId);
  }

  const databasePath = resolveDatabasePath(normalizedId);
  const adapter = createSqliteAdapter(databasePath);
  adapterCache.set(normalizedId, adapter);
  return adapter;
}

module.exports = {
  forUser: getAdapterForUser,
};
