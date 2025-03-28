import fs from 'node:fs';

import plist from '@expo/plist';
import { IOSConfig, ModPlatform } from '@expoot/config-plugins';
import Debug from 'debug';

import { AppIdResolver } from '../AppIdResolver';

const debug = Debug(
  'expo:start:platforms:ios:AppleAppIdResolver'
) as typeof console.log;

/** Resolves the iOS bundle identifier from the Expo config or native files. */
export class AppleAppIdResolver extends AppIdResolver {
  constructor(projectRoot: string, platform: ModPlatform) {
    super(projectRoot, platform, `${platform}.bundleIdentifier`);
  }

  /** @return `true` if the app has valid `*.pbxproj` file */
  async hasNativeProjectAsync(): Promise<boolean> {
    try {
      // Never returns nullish values.
      return !!IOSConfig.Paths.getAllPBXProjectPaths(
        this.projectRoot,
        this.platform
      ).length;
    } catch (error: any) {
      debug('Expected error checking for native project:', error.message);
      return false;
    }
  }

  async resolveAppIdFromNativeAsync(): Promise<string | null> {
    // Check xcode project
    try {
      const bundleId =
        IOSConfig.BundleIdentifier.getBundleIdentifierFromPbxproj(
          this.projectRoot,
          this.platform
        );
      if (bundleId) {
        return bundleId;
      }
    } catch (error: any) {
      debug(
        'Expected error resolving the bundle identifier from the pbxproj:',
        error
      );
    }

    // Check Info.plist
    try {
      const infoPlistPath = IOSConfig.Paths.getInfoPlistPath(
        this.projectRoot,
        this.platform
      );
      const data = await plist.parse(fs.readFileSync(infoPlistPath, 'utf8'));
      if (
        data.CFBundleIdentifier &&
        !data.CFBundleIdentifier.startsWith('$(')
      ) {
        return data.CFBundleIdentifier;
      }
    } catch (error) {
      debug(
        'Expected error resolving the bundle identifier from the project Info.plist:',
        error
      );
    }

    return null;
  }
}
