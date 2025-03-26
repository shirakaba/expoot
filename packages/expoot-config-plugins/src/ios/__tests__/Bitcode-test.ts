import '../../../_mocks/fs.js';

import * as fs from 'node:fs';
import type FS from 'node:fs';

import { setBitcodeWithConfig } from '@expo/config-plugins/build/ios/Bitcode';
import * as WarningAggregator from '@expo/config-plugins/build/utils/warnings';
import { vol } from 'memfs';

import type { ModPlatform, XcodeProject } from '../../Plugin.types';
import { readAllFiles } from '../../plugins/__tests__/fixtures/react-native-project';

import { getPbxproj, isNotComment } from '../utils/Xcodeproj';

const fsActual: typeof FS = await vi.importActual('node:fs');
const rnFixture = readAllFiles(fsActual);

vi.mock('@expo/config-plugins/build/utils/warnings');

describe(setBitcodeWithConfig, () => {
  const projectRoot = '/tablet';
  const platform = 'ios';

  beforeEach(async () => {
    vol.fromJSON(
      {
        'ios/testproject.xcodeproj/project.pbxproj':
          rnFixture['ios/HelloWorld.xcodeproj/project.pbxproj'],
        'ios/testproject/AppDelegate.m': '',
      },
      projectRoot
    );
  });

  afterEach(() => {
    vol.reset();
  });

  // eslint-disable-next-line vitest/expect-expect
  it('defaults to not modifying the bitcode settings', async () => {
    setBitcodeEnabledForRoot(
      { ios: {} },
      projectRoot,
      platform,
      validateDefaultBitcode
    );
  });

  it('enables bitcode for everything', async () => {
    setBitcodeEnabledForRoot(
      { ios: { bitcode: true } },
      projectRoot,
      platform,
      (project) => {
        const configurations = getConfigurations(project);
        for (const [, configuration] of configurations) {
          expect(configuration.buildSettings.ENABLE_BITCODE).toBe('YES');
        }
      }
    );
  });

  it('disables bitcode for everything', async () => {
    setBitcodeEnabledForRoot(
      { ios: { bitcode: false } },
      projectRoot,
      platform,
      (project) => {
        const configurations = getConfigurations(project);
        for (const [, configuration] of configurations) {
          expect(configuration.buildSettings.ENABLE_BITCODE).toBe('NO');
        }
      }
    );
  });

  it('enables bitcode on specific configuration', async () => {
    setBitcodeEnabledForRoot(
      { ios: { bitcode: 'Debug' } },
      projectRoot,
      platform,
      (project) => {
        const configurations = getConfigurations(project);
        for (const [, configuration] of configurations) {
          // ensure all others are disabled
          expect(configuration.buildSettings.ENABLE_BITCODE).toBe(
            configuration.name === 'Debug' ? 'YES' : 'NO'
          );
        }
      }
    );
  });

  it('warns when enabling bitcode on an invalid configuration', async () => {
    setBitcodeEnabledForRoot(
      { ios: { bitcode: 'Bacon' } },
      projectRoot,
      platform,
      validateDefaultBitcode
    );
    expect(WarningAggregator.addWarningIOS).toHaveBeenLastCalledWith(
      'ios.bitcode',
      'No configuration named "Bacon". Expected one of: "Debug", "Release".'
    );
  });
});

function getConfigurations(project: XcodeProject) {
  return Object.entries(project.pbxXCBuildConfigurationSection()).filter(
    isNotComment
  );
}

function setBitcodeEnabledForRoot(
  config: { ios?: { bitcode?: boolean | string } & any },
  projectRoot: string,
  platform: ModPlatform,
  validate: (project: XcodeProject) => void
) {
  let project = getPbxproj(projectRoot, platform);
  project = setBitcodeWithConfig(config, { project });
  validate(project);
  fs.writeFileSync(project.filepath, project.writeSync());
}

function validateDefaultBitcode(project: XcodeProject) {
  const configurations = getConfigurations(project);
  for (const [id, configuration] of configurations) {
    expect(configuration.buildSettings.ENABLE_BITCODE).toBe(
      // Ensure nothing changed.
      {
        '13B07F941A680F5B00A75B9A': 'NO',
        '13B07F951A680F5B00A75B9A': undefined,
        '83CBBA201A601CBA00E9B192': undefined,
        '83CBBA211A601CBA00E9B192': undefined,
      }[id]
    );
  }
}
