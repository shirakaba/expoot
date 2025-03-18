import { IOSConfig } from '@expo/config-plugins';

export * as BuildScheme from './BuildScheme';
export * as BundleIdentifier from './BundleIdentifier';
export * as DevelopmentTeam from './DevelopmentTeam';
export * as Entitlements from './Entitlements';
export * as Google from './Google';
export * as Locales from './Locales';
export * as Paths from './Paths';
export * as PrivacyInfo from './PrivacyInfo';
export * as ProvisioningProfile from './ProvisioningProfile';
export * as Target from './Target';
export * as XcodeUtils from './utils/Xcodeproj';
export { getInfoPlistPathFromPbxproj } from './utils/getInfoPlistPath';

export type InfoPlist = IOSConfig.InfoPlist;
export type ExpoPlist = IOSConfig.ExpoPlist;

const {
  Permissions,
  Bitcode,
  BuildProperties,
  DeviceFamily,
  Maps,
  Name,
  Orientation,
  RequiresFullScreen,
  Scheme,
  Updates,
  UsesNonExemptEncryption,
  Version,
} = IOSConfig;

export {
  Permissions,
  Bitcode,
  BuildProperties,
  DeviceFamily,
  Maps,
  Name,
  Orientation,
  RequiresFullScreen,
  Scheme,
  Updates,
  UsesNonExemptEncryption,
  Version,
};
