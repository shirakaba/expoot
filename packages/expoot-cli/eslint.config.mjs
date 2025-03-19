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
        tsconfigRootDir: import.meta.dirname,
        project: ['tsconfig.eslint.json'],
      },
    },
  },
  {
    rules: {
      // Common complaints in Expo source
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-enum-comparison': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/await-thenable': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      'no-async-promise-executor': 'off',
      'no-empty': 'off',
    },
  },
];
