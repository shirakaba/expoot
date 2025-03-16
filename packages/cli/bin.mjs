#!/usr/bin/env node

import { spawn } from 'node:child_process';
import * as path from 'node:path';
import { argv, cwd, env, stderr, exit } from 'node:process';

const __dirname = import.meta.dirname;
const pathToCli = path.join(__dirname, 'src/cli.ts');
const [executable, _file, ...rest] = argv;

const child = spawn(
  executable,
  ['--experimental-strip-types', pathToCli, ...rest],
  {
    cwd: cwd(),
    stdio: ['inherit', 'inherit', 'pipe'],
    // Ensure we don't lose colour in stderr. But if the user passed FORCE_COLOR
    // themselves for some reason, then respect it.
    env: { ...env, FORCE_COLOR: env.FORCE_COLOR ?? '1' },
  }
);

// Suppress the ExperimentalWarning from --experimental-strip-types.
child.stderr.on(
  'data',
  /** @param {Buffer} data */
  (data) => {
    if (!data.toString().includes('ExperimentalWarning: Type Stripping')) {
      stderr.write(data);
    }
  }
);

child.on('close', (code) => {
  exit(code ?? 1);
});
