const { STORAGE } = require('../config/env');

function loadStorageModule() {
  switch (STORAGE) {
    case 'sheets':
      return require('./sheets');
    case 'sqlite':
    default:
      return require('./sqlite');
  }
}

const storageModule = loadStorageModule();

function getStorageForUser(userId) {
  if (storageModule && typeof storageModule.forUser === 'function') {
    return storageModule.forUser(userId);
  }
  return storageModule;
}

module.exports = {
  forUser: getStorageForUser,
};
