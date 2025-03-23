// https://vitest.dev/guide/mocking.html#example-3
const { fs } = require('memfs');

console.log('mocking fs with memfs');

module.exports = new Proxy(fs, {
  get(_target, prop, _receiver) {
    console.trace(`mock get "${prop.toString()}"`);
    return Reflect.get(...arguments);
  },
});

// module.exports = {
//   ...fs,
//   readdirSync: (path, options) => {
//     console.log('mock readdirSync');
//     fs.readdirSync(path, options);
//   },
// };
