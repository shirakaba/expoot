import fs from 'fs';
import path from 'path';

import * as Log from '@expo/cli/build/src/log.js';
import { directoryExistsAsync } from '@expo/cli/build/src/utils/dir.js';
import { isInteractive } from '@expo/cli/build/src/utils/interactive.js';
import { logNewSection } from '@expo/cli/build/src/utils/ora.js';
import { confirmAsync } from '@expo/cli/build/src/utils/prompts.js';
import {
  IOSConfig,
  AndroidConfig,
  type ModPlatform,
} from '@expoot/config-plugins';
import chalk from 'chalk';

// eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
type ArbitraryPlatform = ModPlatform | string;

/** Delete the input native folders and print a loading step. */
export async function clearNativeFolder(
  projectRoot: string,
  folders: string[]
) {
  const step = logNewSection(`Clearing ${folders.join(', ')}`);
  try {
    await Promise.all(
      folders.map((folderName) =>
        fs.promises.rm(path.join(projectRoot, folderName), {
          recursive: true,
          force: true,
        })
      )
    );
    step.succeed(`Cleared ${folders.join(', ')} code`);
  } catch (error: unknown) {
    step.fail(
      `Failed to delete ${folders.join(', ')} code: ${(error as Error).message}`
    );
    throw error;
  }
}

/**
 * Returns `true` if a certain subset of required Android project files are intact.
 *
 * This isn't perfect but it serves the purpose of indicating that the user should
 * be warned to nuke the project files, most commonly when git is cleared and the root folder
 * remains in memory.
 */
export async function hasRequiredAndroidFilesAsync(
  projectRoot: string
): Promise<boolean> {
  try {
    await Promise.all([
      AndroidConfig.Paths.getAppBuildGradleAsync(projectRoot),
      AndroidConfig.Paths.getProjectBuildGradleAsync(projectRoot),
      AndroidConfig.Paths.getAndroidManifestAsync(projectRoot),
      AndroidConfig.Paths.getMainApplicationAsync(projectRoot),
    ]);
    return true;
  } catch {
    return false;
  }
}

/** Returns `true` if a certain subset of required iOS project files are intact. */
export async function hasRequiredIOSFilesAsync(
  projectRoot: string,
  platform: ModPlatform
) {
  try {
    // If any of the following required files are missing, then the project is malformed.
    await Promise.all([
      IOSConfig.Paths.getAllXcodeProjectPaths(projectRoot, platform),
      IOSConfig.Paths.getAllPBXProjectPaths(projectRoot, platform),
    ]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Filter out platforms that do not have an existing platform folder.
 * If the user wants to validate that neither of ['ios', 'android'] are malformed then we should
 * first check that both `ios` and `android` folders exist.
 *
 * This optimization prevents us from prompting to clear a "malformed" project that doesn't exist yet.
 */
async function filterPlatformsThatDoNotExistAsync(
  projectRoot: string,
  platforms: ArbitraryPlatform[]
): Promise<ArbitraryPlatform[]> {
  const valid = await Promise.all(
    platforms.map(async (platform) => {
      if (await directoryExistsAsync(path.join(projectRoot, platform))) {
        return platform;
      }
      return null;
    })
  );
  return valid.filter(Boolean) as ArbitraryPlatform[];
}

/** Get a list of native platforms that have existing directories which contain malformed projects. */
export async function getMalformedNativeProjectsAsync(
  projectRoot: string,
  platforms: ArbitraryPlatform[]
): Promise<ArbitraryPlatform[]> {
  const VERIFIERS: Record<
    ArbitraryPlatform,
    (root: string) => Promise<boolean>
  > = {
    android: hasRequiredAndroidFilesAsync,
    ios: (root) => hasRequiredIOSFilesAsync(root, 'ios'),
  };

  const checkablePlatforms = platforms.filter(
    (platform) => platform in VERIFIERS
  );
  const checkPlatforms = await filterPlatformsThatDoNotExistAsync(
    projectRoot,
    checkablePlatforms
  );
  return (
    await Promise.all(
      checkPlatforms.map(async (platform) => {
        if (!VERIFIERS[platform]) {
          return false;
        }
        if (await VERIFIERS[platform](projectRoot)) {
          return false;
        }
        return platform;
      })
    )
  ).filter(Boolean) as ArbitraryPlatform[];
}

export async function promptToClearMalformedNativeProjectsAsync(
  projectRoot: string,
  checkPlatforms: ArbitraryPlatform[]
) {
  const platforms = await getMalformedNativeProjectsAsync(
    projectRoot,
    checkPlatforms
  );

  if (!platforms.length) {
    return;
  }

  const displayPlatforms = platforms.map((platform) => chalk.cyan(platform));
  // Prompt which platforms to reset.
  const message =
    platforms.length > 1
      ? `The ${displayPlatforms[0]} and ${displayPlatforms[1]} projects are malformed`
      : `The ${displayPlatforms[0]} project is malformed`;

  if (
    // If the process is non-interactive, default to clearing the malformed native project.
    // This would only happen on re-running prebuild.
    !isInteractive() ||
    // Prompt to clear the native folders.
    (await confirmAsync({
      message: `${message}, would you like to clear the project files and reinitialize them?`,
      initial: true,
    }))
  ) {
    if (!isInteractive()) {
      Log.warn(`${message}, project files will be cleared and reinitialized.`);
    }
    await clearNativeFolder(projectRoot, platforms);
  } else {
    // Warn the user that the process may fail.
    Log.warn('Continuing with malformed native projects');
  }
}
