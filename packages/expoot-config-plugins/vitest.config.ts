import * as path from 'node:path';

import { defineConfig } from 'vitest/config';

const workspace = import.meta.dirname;
const workspaceNodeModules = path.resolve(import.meta.dirname, 'node_modules');
const packages = path.resolve(workspace, '..');
const monorepoRoot = path.resolve(packages, '..');
const rootNodeModules = path.resolve(monorepoRoot, 'node_modules');

export default defineConfig({
  test: {
    root: workspace,
    name: '@expoot/config-plugins',
    // include: ['**/__tests__/*@(test|spec).?(c|m)[jt]s?(x)'],
    include: ['src/ios/__tests__/Paths-test.ts'],
    setupFiles: ['vitest.setup.ts'],
    clearMocks: true,
    globals: true,
    silent: false,
    deps: {
      moduleDirectories: [
        'node_modules',
        packages,
        rootNodeModules,
        workspaceNodeModules,
      ],
    },
  },
});
