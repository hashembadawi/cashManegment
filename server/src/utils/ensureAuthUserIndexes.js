const User = require('../models/User');

async function ensureAuthUserIndexes() {
  const indexes = await User.collection.indexes();
  const legacyIndexes = ['phoneNumber_1', 'accountNumber_1'];

  for (const indexName of legacyIndexes) {
    if (indexes.some((index) => index.name === indexName)) {
      await User.collection.dropIndex(indexName);
      console.log(`Dropped legacy index: ${indexName}`);
    }
  }
}

module.exports = ensureAuthUserIndexes;
