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

module.exports = resolveAdapter();
