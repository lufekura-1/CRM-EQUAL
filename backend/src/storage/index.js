const { STORAGE } = require('../config/env');

function resolveAdapter() {
  switch (STORAGE) {
    case 'sheets':
      return require('./sheets');
    case 'sqlite':
    default:
      return require('./sqlite');
  }
}

const baseAdapter = resolveAdapter();

if (STORAGE === 'sqlite') {
  const createUserScopedAdapter = require('./userScopedSqlite');
  module.exports = createUserScopedAdapter(baseAdapter);
} else {
  module.exports = baseAdapter;
}
