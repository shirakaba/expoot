// https://vitest.dev/guide/mocking.html#example-3

const { fs } = require('memfs');

console.log('mocking fs/promises with memfs');

module.exports = fs.promises;
