import fs from 'node:fs';
import path from 'node:path';

import { exportEagerAsync } from '@expo/cli/build/src/export/embed/exportEager.js';
import * as Log from '@expo/cli/build/src/log.js';
import { ensureNativeProjectAsync } from '@expo/cli/build/src/run/ensureNativeProject.js';
import { logProjectLogsLocation } from '@expo/cli/build/src/run/hints.js';
import {
  getLaunchInfoForBinaryAsync,
  launchAppAsync,
} from '@expo/cli/build/src/run/ios/launchApp.js';
import { resolveOptionsAsync } from '@expo/cli/build/src/run/ios/resolveOptions.js';
import { getValidBinaryPathAsync } from '@expo/cli/build/src/run/ios/validateExternalBinary.js';
import { startBundlerAsync } from '@expo/cli/build/src/run/startBundler.js';
import { AppleAppIdResolver } from '@expo/cli/build/src/start/platforms/ios/AppleAppIdResolver.js';
import {
  getContainerPathAsync,
  simctlAsync,
} from '@expo/cli/build/src/start/platforms/ios/simctl.js';
import { maybePromptToSyncPodsAsync } from '@expo/cli/build/src/utils/cocoapods.js';
import { CommandError } from '@expo/cli/build/src/utils/errors.js';
import { setNodeEnv } from '@expo/cli/build/src/utils/nodeEnv.js';
import { ensurePortAvailabilityAsync } from '@expo/cli/build/src/utils/port.js';
import { profile } from '@expo/cli/build/src/utils/profile.js';
import { getSchemesForIosAsync } from '@expo/cli/build/src/utils/scheme.js';
import type ExpoEnv from '@expo/env';
import spawnAsync from '@expo/spawn-async';
import chalk from 'chalk';
import Debug from 'debug';

import * as XcodeBuild from './XcodeBuild';
import type { Options } from './XcodeBuild.types';

const debug = Debug('expo:run:macos');

export async function runMacosAsync(projectRoot: string, options: Options) {
  setNodeEnv(
    options.configuration === 'Release' ? 'production' : 'development'
  );

  (require('@expo/env') as typeof ExpoEnv).load(projectRoot);

  assertPlatform();

  const install = !!options.install;

  // FIXME: swap for 'macos'
  const platform = 'ios';
  if (
    (await ensureNativeProjectAsync(projectRoot, { platform, install })) &&
    install
  ) {
    await maybePromptToSyncPodsAsync(projectRoot);
  }

  // Resolve the CLI arguments into useable options.
  const props = await profile(resolveOptionsAsync)(
    projectRoot,
    platform,
    options
  );

  if (options.rebundle) {
    Log.warn(
      'The --unstable-rebundle flag is experimental and may not work as expected.'
    );
    // Get the existing binary path to re-bundle the app.

    let binaryPath: string;
    if (!options.binary) {
      if (!props.isSimulator) {
        throw new Error(
          'Re-bundling on physical devices requires the --binary flag.'
        );
      }
      const appId = await new AppleAppIdResolver(
        projectRoot,
        platform
      ).getAppIdAsync();
      const possibleBinaryPath = await getContainerPathAsync(props.device, {
        appId,
      });
      if (!possibleBinaryPath) {
        throw new CommandError(
          `Cannot rebundle because no --binary was provided and no existing binary was found on the device for ID: ${appId}.`
        );
      }
      binaryPath = possibleBinaryPath;
      Log.log('Re-using existing binary path:', binaryPath);
      // Set the binary path to the existing binary path.
      options.binary = binaryPath;
    }

    Log.log('Rebundling the Expo config file');
    // Re-bundle the config file the same way the app was originally bundled.
    await spawnAsync('node', [
      path.join(
        require.resolve('expo-constants/package.json'),
        '../scripts/getAppConfig.js'
      ),
      projectRoot,
      path.join(options.binary, 'EXConstants.bundle'),
    ]);
    // Re-bundle the app.

    const possibleBundleOutput = path.join(options.binary, 'main.jsbundle');

    if (fs.existsSync(possibleBundleOutput)) {
      Log.log('Rebundling the app...');
      await exportEagerAsync(projectRoot, {
        resetCache: false,
        dev: false,
        platform,
        assetsDest: path.join(options.binary, 'assets'),
        bundleOutput: possibleBundleOutput,
      });
    } else {
      Log.warn(
        'Bundle output not found at expected location:',
        possibleBundleOutput
      );
    }
  }

  let binaryPath: string;
  if (options.binary) {
    binaryPath = await getValidBinaryPathAsync(options.binary, props);
    Log.log('Using custom binary path:', binaryPath);
  } else {
    let eagerBundleOptions: string | undefined;

    if (options.configuration === 'Release') {
      eagerBundleOptions = JSON.stringify(
        await exportEagerAsync(projectRoot, {
          dev: false,
          platform,
        })
      );
    }

    // Spawn the `xcodebuild` process to create the app binary.
    const buildOutput = await XcodeBuild.buildAsync({
      ...props,
      eagerBundleOptions,
    });

    // Find the path to the built app binary, this will be used to install the binary
    // on a device.

    binaryPath = await profile(XcodeBuild.getAppBinaryPath)(buildOutput);
  }
  debug('Binary path:', binaryPath);

  // Ensure the port hasn't become busy during the build.
  if (
    props.shouldStartBundler &&
    !(await ensurePortAvailabilityAsync(projectRoot, props))
  ) {
    props.shouldStartBundler = false;
  }

  const launchInfo = await getLaunchInfoForBinaryAsync(binaryPath);
  const isCustomBinary = !!options.binary;

  // Always close the app before launching on a simulator. Otherwise certain cached resources like the splashscreen will not be available.
  if (props.isSimulator) {
    try {
      await simctlAsync(['terminate', props.device.udid, launchInfo.bundleId]);
    } catch (error) {
      // If we failed it's likely that the app was not running to begin with and we will get an `invalid device` error
      debug(
        'Failed to terminate app (possibly because it was not running):',
        error
      );
    }
  }

  // Start the dev server which creates all of the required info for
  // launching the app on a simulator.
  const manager = await startBundlerAsync(projectRoot, {
    port: props.port,
    headless: !props.shouldStartBundler,
    // If a scheme is specified then use that instead of the package name.

    scheme: isCustomBinary
      ? // If launching a custom binary, use the schemes in the Info.plist.
        launchInfo.schemes[0]
      : // If a scheme is specified then use that instead of the package name.
        (await getSchemesForIosAsync(projectRoot, platform))?.[0],
  });

  // Install and launch the app binary on a device.
  await launchAppAsync(
    binaryPath,
    manager,
    {
      isSimulator: props.isSimulator,
      device: props.device,
      shouldStartBundler: props.shouldStartBundler,
    },
    launchInfo.bundleId
  );

  // Log the location of the JS logs for the device.
  if (props.shouldStartBundler) {
    logProjectLogsLocation();
  } else {
    await manager.stopAsync();
  }
}

function assertPlatform() {
  if (process.platform !== 'darwin') {
    Log.exit(
      chalk`macOS apps can only be built on macOS devices. In future, you will be able to use {cyan eas build -p macos} to build in the cloud.`
    );
  }
}
