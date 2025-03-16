import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { argv, cwd, exit } from 'node:process';

import expoPackageJson from '@expo/cli/package.json' with { type: 'json' };

const require = createRequire(import.meta.url);

export function spawnExpoCli(args: ReadonlyArray<string>) {
  const expoCli = path.resolve(
    path.dirname(require.resolve('@expo/cli/package.json')),
    (expoPackageJson as { main: string }).main
  );
  const child = spawn(argv[0], [expoCli, ...args], {
    cwd: cwd(),
    stdio: 'inherit',
  });
  child.on('close', (code) => {
    exit(code ?? 1);
  });
}
