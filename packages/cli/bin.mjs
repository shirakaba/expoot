#!/usr/bin/env node

// This happy little script runs our TypeScript source directly as a subprocess
// of the JavaScript runtime that's calling us, allowing us to forego a build
// step.
//
// However, it adds about 300 ms of overhead as far as I can tell, so although
// it's handy in dev to avoid having to run TypeScript in watch mode, we'll want
// to offer a ready-built CLI for production usage.

import { spawn } from 'node:child_process';
import * as path from 'node:path';
import { argv, cwd } from 'node:process';

const __dirname = import.meta.dirname;
const pathToCli = path.join(__dirname, 'src/cli.ts');

spawn(argv[0], ['--import', 'ts-blank-space/register', pathToCli], {
  cwd: cwd(),
  stdio: 'inherit',
});
