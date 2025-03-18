/**
 * The standard Expo config object defined in `app.config.js` files.
 */

import type { ExpoConfig as UpstreamExpoConfig, IOS } from '@expo/config-types';

export interface ExpoConfig extends Omit<UpstreamExpoConfig, 'platforms'> {
  /**
   * Platforms that your project explicitly supports. If not specified, it defaults to `["ios", "android", "macos", "windows"]`.
   */
  platforms?: ('android' | 'ios' | 'web' | 'macos' | 'windows')[];

  macos?: MacOS;
  windows?: Windows;
}

export type MacOS = IOS;
export type Windows = Record<string, never>;

export type {
  Splash,
  IOS,
  IOSIcons,
  Android,
  AndroidIntentFiltersData,
  Web,
} from '@expo/config-types';
