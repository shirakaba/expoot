export * as IOSConfig from './ios';

// macOS- and Windows-sympathetic plugin types
export {
  type ModConfig,
  type ModPlatform,
  type ModProps,
  type ExportedConfig,
  type ExportedConfigWithProps,
  type PluginParameters,
  type ConfigPlugin,
  type StaticPlugin,
  type Mod,
  XcodeProject,
  type InfoPlist,
  type ExpoPlist,
  type AndroidManifest,
} from './Plugin.types';

export {
  Updates,
  AndroidConfig,
  WarningAggregator,
  History,
  XML,

  // plugins/with*
  withPlugins,
  withRunOnce,
  createRunOncePlugin,
  withDangerousMod,
  withFinalizedMod,
  withMod,
  withBaseMod,
  withStaticPlugin,
  compileModsAsync,
  withDefaultBaseMods,
  evalModsAsync,

  // plugins/ios-plugins
  withAppDelegate,
  withInfoPlist,
  withEntitlementsPlist,
  withExpoPlist,
  withXcodeProject,
  withPodfile,
  withPodfileProperties,

  // plugins/android-plugins
  withAndroidManifest,
  withStringsXml,
  withAndroidColors,
  withAndroidColorsNight,
  withAndroidStyles,
  withMainActivity,
  withMainApplication,
  withProjectBuildGradle,
  withAppBuildGradle,
  withSettingsGradle,
  withGradleProperties,

  // Other
  PluginError,
  BaseMods,
} from '@expo/config-plugins';
