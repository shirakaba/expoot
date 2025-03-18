import { argv, exit } from 'node:process';
import { parseArgs } from 'node:util';

import expoPackageJson from '@expo/cli/package.json' with { type: 'json' };
import chalk from 'chalk';

import expootPackageJson from '../package.json' with { type: 'json' };

import { spawnExpoCli } from './spawn-expo-cli.ts';

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

await main();

async function main() {
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

  const command = subcommand ?? 'start';
  const commandArgs = subcommand ? positionals.slice(1) : [];
  if (help) {
    commandArgs.push('--help');
  }

  switch (subcommand) {
    case 'prebuild': {
      console.log(`intercepted ${subcommand}`);
      return;
    }
    case 'run': {
      console.log(`intercepted ${subcommand}`);
      const { expootRun } = await import('./run/index.ts');
      await expootRun(commandArgs);
      return;
    }
    case 'run:macos': {
      const { expootRunMacos } = await import('./run/macos/index.ts');
      await expootRunMacos(commandArgs);
      return;
    }
    case 'run:windows': {
      const { expootRunWindows } = await import('./run/windows/index.ts');
      await expootRunWindows(commandArgs);
      return;
    }
  }

  spawnExpoCli([command, ...commandArgs]);
}
