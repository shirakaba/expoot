#!/usr/bin/env node
import { exit } from 'node:process';
import { parseArgs } from 'node:util';

import chalk from 'chalk';

import { spawnExpoCli } from '../spawn-expo-cli.ts';
import { CommandError, logCmdError } from '../utils/errors.ts';

export async function expootRun(params = new Array<string>()) {
  try {
    const args = parseArgs({
      args: params,
      options: {
        help: {
          type: 'boolean',
          short: 'h',
        },
      },
      allowPositionals: true,
    });

    const {
      values: { help },
      positionals,
    } = args;

    const platform = positionals.at(0);
    const argsWithoutPlatform = params.filter((param) => param !== platform);

    // For now, we do not support `npx expoot run` on its own (that would
    // require implementing an interactive platform selector)
    if (!platform || help) {
      console.log(chalk`
        {bold Info}
          Run the native app locally
  
        {bold Usage}
          {dim $} npx expoot run <android|ios|macos|windows>
        {bold Options}
          {dim $} npx expoot run <android|ios|macos|windows> --help  Output usage information
      `);
      exit(0);
    }

    switch (platform) {
      case 'android': {
        spawnExpoCli(['run:android', ...argsWithoutPlatform]);
        return;
      }
      case 'ios': {
        spawnExpoCli(['run:ios', ...argsWithoutPlatform]);
        return;
      }

      case 'macos': {
        const { expootRunMacos } = await import('./macos/index.ts');
        return expootRunMacos(argsWithoutPlatform);
      }

      case 'windows': {
        const { expootRunWindows } = await import('./windows/index.ts');
        return expootRunWindows(argsWithoutPlatform);
      }

      default:
        throw new CommandError(
          'UNSUPPORTED_PLATFORM',
          `Unsupported platform: ${platform}`
        );
    }
  } catch (error) {
    logCmdError(error);
  }
}
