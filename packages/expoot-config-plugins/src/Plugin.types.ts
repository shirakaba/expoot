import type {
  InfoPlist,
  XcodeProject,
  Mod as UpstreamMod,
  ModConfig as UpstreamModConfig,
  ModProps as UpstreamModProps,
} from '@expo/config-plugins';
import type { JSONObject } from '@expo/json-file';
import type { ExpoConfig } from '@expoot/config-types';

import type { AppDelegateProjectFile } from './ios/Paths';

type OptionalPromise<T> = Promise<T> | T;
type Plist = JSONObject;

type SanitizeMod<Type> = Type extends UpstreamMod<infer X> ? Mod<X> : never;
type SanitizeModsRecord<T> = {
  [P in keyof T]: SanitizeMod<T[P]>;
};
type SanitizeModsRecordOfRecords<T> = {
  [P in keyof T]: SanitizeModsRecord<T[P]>;
};

export interface ModConfig
  extends SanitizeModsRecordOfRecords<UpstreamModConfig> {
  macos?: {
    /**
     * Dangerously make a modification before any other platform mods have been run.
     */
    dangerous?: Mod<unknown>;
    /**
     * Dangerously make a modification after all the other platform mods have been run.
     */
    finalized?: Mod<unknown>;
    /**
     * Modify the `ios/<name>/Info.plist` as JSON (parsed with [`@expo/plist`](https://www.npmjs.com/package/@expo/plist)).
     */
    infoPlist?: Mod<InfoPlist>;
    /**
     * Modify the `ios/<name>/<product-name>.entitlements` as JSON (parsed with [`@expo/plist`](https://www.npmjs.com/package/@expo/plist)).
     */
    entitlements?: Mod<Plist>;
    /**
     * Modify the `ios/<name>/Expo.plist` as JSON (Expo updates config for iOS) (parsed with [`@expo/plist`](https://www.npmjs.com/package/@expo/plist)).
     */
    expoPlist?: Mod<Plist>;
    /**
     * Modify the `ios/<name>.xcodeproj` as an `XcodeProject` (parsed with [`xcode`](https://www.npmjs.com/package/xcode))
     */
    xcodeproj?: Mod<XcodeProject>;
    /**
     * Modify the `ios/<name>/AppDelegate.m` as a string (dangerous)
     */
    appDelegate?: Mod<AppDelegateProjectFile>;
    /**
     * Modify the `ios/Podfile.properties.json` as key-value pairs
     */
    podfileProperties?: Mod<Record<string, string>>;
  };
  windows?: Record<string, never>;
}

// Replace all the types that depend on UpstreamModConfig with equivalents that
// depend on ModConfig so that the 'macos' and 'windows' keys are present.
export type ModPlatform = keyof ModConfig;
export type ModProps<T = any> = Omit<
  UpstreamModProps<T>,
  'platform' | 'nextMod'
> & {
  readonly platform: ModPlatform;
  nextMod?: Mod<T>;
};
export interface ExportedConfigWithProps<Data = any> extends ExportedConfig {
  /**
   * The Object representation of a complex file type.
   */
  modResults: Data;
  modRequest: ModProps<Data>;
  /**
   * A frozen representation of the original file contents,
   * this can be used as a reference into the user's original intent.
   *
   * For example, you could infer that the user defined a certain
   * value explicitly and disable any automatic changes.
   */
  readonly modRawConfig: ExpoConfig;
}
/**
 * A helper type to get the properties of a plugin.
 */
export type PluginParameters<T extends ConfigPlugin<any>> = T extends (
  config: any,
  props: infer P
) => any
  ? P
  : never;
export type ConfigPlugin<Props = void> = (
  config: ExpoConfig,
  props: Props
) => ExpoConfig;
export type StaticPlugin<T = any> = [string | ConfigPlugin<T>, T];
export type Mod<Props = any> = ((
  config: ExportedConfigWithProps<Props>
) => OptionalPromise<ExportedConfigWithProps<Props>>) & {
  isProvider?: boolean;
  isIntrospective?: boolean;
};
export interface ExportedConfig extends ExpoConfig {
  mods?: ModConfig | null;
}

export {
  XcodeProject,
  type InfoPlist,
  type ExpoPlist,
  type AndroidManifest,
} from '@expo/config-plugins';
