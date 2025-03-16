import tseslint from 'typescript-eslint';

import baseConfig from '../../eslint.config.mjs';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...baseConfig,

  // Enable typed linting.
  // https://typescript-eslint.io/getting-started/typed-linting/
  // https://typescript-eslint.io/troubleshooting/typed-linting/#traditional-project-issues
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      // Based on: https://github.com/typescript-eslint/typescript-eslint/blob/958fecaef10a26792dc00e936e98cb19fd26d05f/.eslintrc.js
      parserOptions: {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        tsconfigRootDir: import.meta.dirname,
        project: ['tsconfig.eslint.json'],
      },
    },
  },
];
