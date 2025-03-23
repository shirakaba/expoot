import * as path from 'node:path';

import commonjs from 'vite-plugin-commonjs';
import { defineConfig } from 'vitest/config';

const workspace = import.meta.dirname;
const workspaceNodeModules = path.resolve(import.meta.dirname, 'node_modules');
const packages = path.resolve(workspace, '..');
const monorepoRoot = path.resolve(packages, '..');
const rootNodeModules = path.resolve(monorepoRoot, 'node_modules');

export default defineConfig({
  plugins: [
    commonjs({
      filter(id) {
        // `node_modules` is exclude by default, so we need to include it explicitly
        // https://github.com/vite-plugin/vite-plugin-commonjs/blob/v0.7.0/src/index.ts#L125-L127
        if (
          id.includes('node_modules/xcode') ||
          id.includes('node_modules/@expo/config-plugins')
        ) {
          return true;
        }
      },
    }),
  ],
  test: {
    root: workspace,
    name: '@expoot/config-plugins',
    include: ['**/__tests__/*@(test|spec).?(c|m)[jt]s?(x)'],
    setupFiles: ['vitest.setup.ts'],
    clearMocks: true,
    globals: true,
    silent: false,
    server: {
      deps: {
        inline: ['@expo/config-plugins', 'glob', 'xcode'],
        moduleDirectories: [
          packages,
          rootNodeModules,
          workspaceNodeModules,
        ].map((x) => path.relative(workspace, x)),
      },
    },
  },
});
