// https://github.com/iamturns/eslint-config-airbnb-typescript/issues/345#issuecomment-2269783683
/* eslint-disable import/no-unresolved */
import globals from 'globals';
import pluginJs from '@eslint/js';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import importPlugin from 'eslint-plugin-import';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import { configs as tsEslintConfigs } from '@typescript-eslint/eslint-plugin';
const { 'disable-type-checked': disableTypeChecked } = tsEslintConfigs;

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'],
    languageOptions: { globals: globals.browser, ecmaVersion: 'latest' },
    'linebreak-style': ['error', 'unix'],
  },
  pluginJs.configs.recommended,

  // While at the root of the monorepo, we take "recommended" because we have no
  // tsconfig.json, any workspaces that do have a tsconfig.json should:
  // - override this with `tseslint.configs.recommendedTypeChecked`
  // - set `projectService: true`
  // - pass `tsconfigRootDir: import.meta.dirname`
  // https://typescript-eslint.io/getting-started/typed-linting
  ...tseslint.configs.recommended,

  pluginReact.configs.flat.recommended,
  importPlugin.flatConfigs.recommended,
  eslintConfigPrettier,
  {
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],

    languageOptions: {
      parserOptions: disableTypeChecked.parserOptions ?? {},
    },

    rules: disableTypeChecked.rules ?? {},
  },
  {
    rules: {
      'import/first': 'error',
      'import/newline-after-import': 'error',
      'import/no-duplicates': 'error',
      'import/order': [
        'warn',
        {
          alphabetize: { order: 'asc' },
          pathGroups: [
            {
              pattern: '../../../../**',
              group: 'parent',
              position: 'before',
            },
            {
              pattern: '../../../**',
              group: 'parent',
              position: 'before',
            },
            {
              pattern: '../../**',
              group: 'parent',
              position: 'before',
            },
            {
              pattern: '../**',
              group: 'parent',
              position: 'before',
            },
          ],
          'newlines-between': 'always',
        },
      ],

      'linebreak-style': ['error', 'unix'],

      'no-constant-condition': [
        'error',
        {
          checkLoops: false,
        },
      ],

      'no-prototype-builtins': 'off',

      'prefer-const': [
        'error',
        {
          destructuring: 'all',
        },
      ],

      quotes: [
        'error',
        'single',
        {
          avoidEscape: true,
        },
      ],

      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/no-unknown-property': 'off',
      semi: ['error', 'always'],
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-explicit-any': 'off',

      '@typescript-eslint/no-floating-promises': [
        'warn',
        {
          ignoreIIFE: false,
        },
      ],

      '@typescript-eslint/no-misused-promises': [
        'warn',
        {
          checksVoidReturn: false,
        },
      ],

      '@typescript-eslint/no-non-null-assertion': 'off',

      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
    },
  },
];
