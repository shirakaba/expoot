#!/usr/bin/env node
import { exit } from 'node:process';
import { parseArgs } from 'node:util';

import chalk from 'chalk';

import { logCmdError } from '../../utils/errors.ts';

// eslint-disable-next-line @typescript-eslint/require-await
export async function expootRunWindows(params = new Array<string>()) {
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
    } = args;

    if (help) {
      console.log(chalk`
  {bold Info}
    Run the Windows app binary locally

  {bold Usage}
    {dim $} npx expoot run:windows
  {bold Options}
    --no-build-cache                 Clear the native derived data before building
    --no-install                     Skip installing dependencies
    --no-bundler                     Skip starting the Metro bundler
    --scheme [scheme]                Scheme to build
    --configuration <configuration>  MSBuild configuration to use. Debug or Release. {dim Default: Debug}
    -p, --port <port>                Port to start the Metro bundler on. {dim Default: 8081}
    -h, --help                       Usage info
  Build for production (unsigned) with the {bold Release} configuration:
    {dim $} npx expoot run:windows --configuration Release
      `);
      exit(0);
    }

    console.log('TODO: run:windows');
  } catch (error) {
    logCmdError(error);
  }
}
