import type { OSType } from '@expo/cli/build/src/start/platforms/ios/simctl.js';
import { ModPlatform } from '@expoot/config-plugins';

import { BundlerProps } from '../resolveBundlerProps';

export type XcodeConfiguration = 'Debug' | 'Release';

export type Options = {
  /** iOS device to target. */
  device?: string | boolean;
  /** Dev server port to use, ignored if `bundler` is `false`. */
  port?: number;
  /** Xcode scheme to build. */
  scheme?: string | boolean;
  /** Xcode configuration to build. Default `Debug` */
  configuration?: XcodeConfiguration;
  /** Should start the bundler dev server. */
  bundler?: boolean;
  /** Should install missing dependencies before building. */
  install?: boolean;
  /** Should use derived data for builds. */
  buildCache?: boolean;
  /** Path to an existing binary to install on the device. */
  binary?: string;

  /** Re-bundle JS and assets, then embed in existing app, and install again. */
  rebundle?: boolean;
};

export type ProjectInfo = {
  isWorkspace: boolean;
  name: string;
};

export type BuildProps = {
  /** The platform being built (e.g. 'ios'). */
  platform: ModPlatform;
  /** Root to the iOS native project. */
  projectRoot: string;
  /** Is the target a simulator. */
  isSimulator: boolean;
  xcodeProject: ProjectInfo;
  device: { name: string; udid: string; osType: OSType };
  configuration: XcodeConfiguration;
  /** Disable the initial bundling from the native script. */
  shouldSkipInitialBundling: boolean;
  /** Should use derived data for builds. */
  buildCache: boolean;
  scheme: string;

  /** Options that were used to create the eager bundle in release builds. */
  eagerBundleOptions?: string;
} & BundlerProps;
