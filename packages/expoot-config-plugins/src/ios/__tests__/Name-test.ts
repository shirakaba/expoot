import '../../../_mocks/fs.js';

import * as fs from 'node:fs';
import type FS from 'node:fs';

import {
  getName,
  setDisplayName,
  setName,
  setProductName,
} from '@expo/config-plugins/build/ios/Name';
import type { ExpoConfig } from '@expoot/config-types';
import { vol } from 'memfs';

import type { ModPlatform } from '../../Plugin.types';
import { readAllFiles } from '../../plugins/__tests__/fixtures/react-native-project';

import { getPbxproj, isBuildConfig, isNotComment } from '../utils/Xcodeproj';

const fsActual: typeof FS = await vi.importActual('node:fs');
const rnFixture = readAllFiles(fsActual);

describe(getName, () => {
  it('returns null if no bundleIdentifier is provided', () => {
    expect(getName({} as any)).toBe(null);
  });

  it('returns the name if provided', () => {
    expect(getName({ name: 'Some iOS app' })).toBe('Some iOS app');
  });
});
describe(setDisplayName, () => {
  it('sets the CFBundleDisplayName if name is given', () => {
    expect(setDisplayName({ name: 'Expo app' }, {})).toMatchObject({
      CFBundleDisplayName: 'Expo app',
    });
  });
});
describe(setName, () => {
  it('makes no changes to the infoPlist no name is provided', () => {
    expect(setName({} as any, {})).toMatchObject({});
  });
});
describe(setProductName, () => {
  const projectRoot = '/';
  const platform = 'ios';
  beforeAll(async () => {
    vol.fromJSON(
      {
        'ios/testproject.xcodeproj/project.pbxproj':
          rnFixture['ios/HelloWorld.xcodeproj/project.pbxproj'],
        'ios/testproject/AppDelegate.m': '',
      },
      projectRoot
    );
  });

  afterAll(() => {
    vol.reset();
  });

  it('sets the iOS PRODUCT_NAME value', () => {
    for (const [input, output] of [
      ['My Cool Thing', '"MyCoolThing"'],
      ['h"&<world/>🚀', '"hworld"'],
    ]) {
      // Ensure the value can be parsed and written.
      const project = setProductNameForRoot(
        { name: input, slug: '' },
        projectRoot,
        platform
      );
      expect(
        Object.entries(project.pbxXCBuildConfigurationSection())
          .filter(isNotComment)
          // @ts-ignore
          .filter(isBuildConfig)[0][1]?.buildSettings?.PRODUCT_NAME
        // Ensure the value is wrapped in quotes.
      ).toBe(output);
    }
  });
});

function setProductNameForRoot(
  config: ExpoConfig,
  projectRoot: string,
  platform: ModPlatform
) {
  let project = getPbxproj(projectRoot, platform);
  project = setProductName(config, project);
  fs.writeFileSync(project.filepath, project.writeSync());
  return project;
}
