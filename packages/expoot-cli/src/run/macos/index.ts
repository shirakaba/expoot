#!/usr/bin/env node
import path from 'node:path';
import { exit } from 'node:process';
import { parseArgs } from 'node:util';

import chalk from 'chalk';

import { logCmdError } from '../../utils/errors.ts';

import type { XcodeConfiguration } from './XcodeBuild.types.ts';

export async function expootRunMacos(params = new Array<string>()) {
  try {
    const args = parseArgs({
      args: params,
      options: {
        'no-install': { type: 'boolean' },
        'no-build-cache': { type: 'boolean' },
        'no-bundler': { type: 'boolean' },
        scheme: { type: 'string' },
        binary: { type: 'string' },
        configuration: { type: 'string', default: 'Debug' },
        port: { type: 'string', default: '8081' },
        'unstable-rebundle': { type: 'boolean' },
        help: { type: 'boolean', short: 'h' },
        device: { type: 'string', short: 'd' },
      },
      allowPositionals: true,
      // This makes all behave as either boolean or string, allowing both
      // `--device` as boolean and `--device` as string. Unfortunately forfeits
      // the free validation of correct usage of flags.
      //
      // TODO: use strict parsing for all args except the hybrid ones.
      strict: false,
    });

    const {
      values: {
        'no-build-cache': noBuildCache,
        'no-install': noInstall,
        'no-bundler': noBundler,
        scheme,
        binary,
        configuration,
        port,
        'unstable-rebundle': rebundle,
        help,
        device,
      },
      positionals,
    } = args;

    if (help) {
      console.log(chalk`
  {bold Info}
    Run the macOS app binary locally

  {bold Usage}
    {dim $} npx expoot run:macos
  {bold Options}
    --no-build-cache                 Clear the native derived data before building
    --no-install                     Skip installing dependencies
    --no-bundler                     Skip starting the Metro bundler
    --scheme [scheme]                Scheme to build
    --binary <path>                  Path to existing .app or .ipa to install.
    --configuration <configuration>  Xcode configuration to use. Debug or Release. {dim Default: Debug}
    -p, --port <port>                Port to start the Metro bundler on. {dim Default: 8081}
    -h, --help                       Usage info
  Build for production (unsigned) with the {bold Release} configuration:
    {dim $} npx expoot run:macos --configuration Release
      `);
      exit(0);
    }

    const { runMacosAsync } = await import('./runMacosAsync.js');

    // "If the last value is not a flag and it doesn't have a recognized flag
    // before it (instead having a string value or nothing) then it must be the
    // project root."
    const projectRoot = positionals.at(-1) ?? '.';

    return runMacosAsync(path.resolve(projectRoot), {
      // Parsed options
      buildCache: !noBuildCache,
      install: !noInstall,
      bundler: !noBundler,
      port: typeof port === 'string' ? Number.parseInt(port) : undefined,
      binary: typeof binary === 'string' ? binary : undefined,
      rebundle: !!rebundle,
      device,
      scheme,
      configuration: configuration as XcodeConfiguration,
    }).catch(logCmdError);
  } catch (error) {
    logCmdError(error);
  }
}
