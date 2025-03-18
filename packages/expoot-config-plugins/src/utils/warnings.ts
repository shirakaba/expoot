import chalk from 'chalk';

import type { ModPlatform } from '../Plugin.types';

/**
 * Log a warning that doesn't disrupt the spinners.
 *
 * ```sh
 * » android: android.package: property is invalid https://expo.fyi/android-package
 * ```
 *
 * @param property Name of the config property that triggered the warning (best-effort)
 * @param text Main warning message
 * @param link Useful link to resources related to the warning
 */
export function addWarningAndroid(
  property: string,
  text: string,
  link?: string
) {
  addWarningForPlatform('android', property, text, link);
}

/**
 * Log a warning that doesn't disrupt the spinners.
 *
 * ```sh
 * » ios: ios.bundleIdentifier: property is invalid https://expo.fyi/bundle-identifier
 * ```
 *
 * @param property Name of the config property that triggered the warning (best-effort)
 * @param text Main warning message
 * @param link Useful link to resources related to the warning
 */
export function addWarningIOS(property: string, text: string, link?: string) {
  addWarningForPlatform('ios', property, text, link);
}

/**
 * Log a warning that doesn't disrupt the spinners.
 *
 * ```sh
 * » macos: macos.bundleIdentifier: property is invalid https://expo.fyi/bundle-identifier
 * ```
 *
 * @param property Name of the config property that triggered the warning (best-effort)
 * @param text Main warning message
 * @param link Useful link to resources related to the warning
 */
export function addWarningMacOS(property: string, text: string, link?: string) {
  addWarningForPlatform('macos', property, text, link);
}

/**
 * Log a warning that doesn't disrupt the spinners.
 *
 * ```sh
 * » windows: windows.guid: property is invalid
 * ```
 *
 * @param property Name of the config property that triggered the warning (best-effort)
 * @param text Main warning message
 * @param link Useful link to resources related to the warning
 */
export function addWarningWindows(
  property: string,
  text: string,
  link?: string
) {
  addWarningForPlatform('windows', property, text, link);
}

export function addWarningForPlatform(
  platform: ModPlatform & string,
  property: string,
  text: string,
  link?: string
) {
  console.warn(formatWarning(platform, property, text, link));
}

function formatWarning(
  platform: string,
  property: string,
  warning: string,
  link?: string
) {
  return chalk.yellow`${'» ' + chalk.bold(platform)}: ${property}: ${warning}${
    link ? chalk.gray(' ' + link) : ''
  }`;
}
