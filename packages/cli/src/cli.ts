import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { argv, cwd, exit } from 'node:process';
import { parseArgs } from 'node:util';

import expoPackageJson from '@expo/cli/package.json' with { type: 'json' };
import expootPackageJson from '@expoot/cli/package.json' with { type: 'json' };
import chalk from 'chalk';

const require = createRequire(import.meta.url);

const migratedCommands = new Set([
  'init',
  'eject',
  'web',
  'start:web',
  'build:ios',
  'build:android',
  'client:install:ios',
  'client:install:android',
  'doctor',
  'upgrade',
  'customize:web',
  'publish',
  'publish:set',
  'publish:rollback',
  'publish:history',
  'publish:details',
  'build:web',
  'credentials:manager',
  'fetch:ios:certs',
  'fetch:android:keystore',
  'fetch:android:hashes',
  'fetch:android:upload-cert',
  'push:android:upload',
  'push:android:show',
  'push:android:clear',
  'url',
  'url:ipa',
  'url:apk',
  'webhooks',
  'webhooks:add',
  'webhooks:remove',
  'webhooks:update',
  'build:status',
  'upload:android',
  'upload:ios',
]);

main();

function main() {
  const args = parseArgs({
    args: argv.slice(2),
    options: {
      version: {
        type: 'boolean',
        short: 'v',
      },
      'non-interactive': {
        type: 'boolean',
      },
      help: {
        type: 'boolean',
        short: 'h',
      },
    },
    allowPositionals: true,
    allowNegative: true,
  });

  const {
    values: { version, help, 'non-interactive': nonInteractive },
    positionals,
  } = args;

  if (version) {
    console.log(
      `@expoot/cli: ${(expootPackageJson as { version: string }).version}`
    );
    console.log(
      `  @expo/cli: ${(expoPackageJson as { version: string }).version}`
    );
    return;
  }

  if (nonInteractive) {
    console.warn(
      chalk.yellow`  {bold --non-interactive} is not supported, use {bold $CI=1} instead`
    );
  }

  const subcommand = positionals.at(0);

  if (!subcommand && help) {
    console.log(chalk`
      {bold Usage}
        {dim $} npx expoot <command>
  
      {bold Commands}
        start, export
        run:ios, run:android, run:macos, run:windows, prebuild
        install, customize, config
        {dim login, logout, whoami, register}
      {bold Options}
        --version, -v   Version number
        --help, -h      Usage info
  
      For more info run a command with the {bold --help} flag
        {dim $} npx expoot start --help
    `);
    exit(0);
  }

  if (subcommand && migratedCommands.has(subcommand)) {
    spawnExpoCli([subcommand]);
    return;
  }

  // TODO: intercept run:macos, run:windows, and prebuild

  const command = subcommand ?? 'start';
  const commandArgs = subcommand ? positionals.slice(1) : [];
  if (help) {
    commandArgs.push('--help');
  }

  spawnExpoCli([command, ...commandArgs]);
}

function spawnExpoCli(args: ReadonlyArray<string>) {
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
