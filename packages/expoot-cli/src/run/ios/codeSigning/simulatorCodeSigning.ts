import fs from 'fs';

import plist from '@expo/plist';
import { IOSConfig, ModPlatform } from '@expoot/config-plugins';
import Debug from 'debug';

const debug = Debug('expo:run:ios:codeSigning:simulator');

// NOTE(EvanBacon): These are entitlements that work in a simulator
// but still require the project to have development code signing setup.
// There may be more, but this is fine for now.
const ENTITLEMENTS_THAT_REQUIRE_CODE_SIGNING = [
  'com.apple.developer.associated-domains',
  'com.apple.developer.applesignin',
];

function getEntitlements(
  projectRoot: string,
  platform: ModPlatform
): Record<string, any> | null {
  try {
    const entitlementsPath = IOSConfig.Entitlements.getEntitlementsPath(
      projectRoot,
      platform
    );
    if (!entitlementsPath || !fs.existsSync(entitlementsPath)) {
      return null;
    }

    const entitlementsContents = fs.readFileSync(entitlementsPath, 'utf8');
    const entitlements = plist.parse(entitlementsContents);
    return entitlements;
  } catch (error) {
    debug('Failed to read entitlements', error);
  }
  return null;
}

/** @returns true if the simulator build should be code signed for development. */
export function simulatorBuildRequiresCodeSigning(
  projectRoot: string,
  platform: ModPlatform
): boolean {
  const entitlements = getEntitlements(projectRoot, platform);
  if (!entitlements) {
    return false;
  }
  return ENTITLEMENTS_THAT_REQUIRE_CODE_SIGNING.some(
    (entitlement) => entitlement in entitlements
  );
}
