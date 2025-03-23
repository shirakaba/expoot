import '../../../_mocks/fs.js';

import type FS from 'node:fs';
import * as path from 'node:path';

import type { ExpoConfig } from '@expoot/config-types';
import { fs as memfs, vol } from 'memfs';

import { readAllFiles } from '../../plugins/__tests__/fixtures/react-native-project';

import {
  getBundleIdentifier,
  getBundleIdentifierFromPbxproj,
  setBundleIdentifier,
  setBundleIdentifierForPbxproj,
} from '../BundleIdentifier';

const baseExpoConfig: ExpoConfig = {
  name: 'testproject',
  slug: 'testproject',
  platforms: ['ios'],
  version: '1.0.0',
};

const originalFs: typeof FS = await vi.importActual('node:fs');
const rnFixture = readAllFiles(originalFs);

describe('BundleIdentifier module', () => {
  const platform = 'ios';

  describe(getBundleIdentifier, () => {
    it('returns null if no bundleIdentifier is provided', () => {
      expect(getBundleIdentifier(baseExpoConfig)).toBe(null);
    });

    it('returns the bundleIdentifier if provided', () => {
      expect(
        getBundleIdentifier({
          ...baseExpoConfig,
          ios: { bundleIdentifier: 'com.example.xyz' },
        })
      ).toBe('com.example.xyz');
    });
  });

  describe(getBundleIdentifierFromPbxproj, () => {
    const projectRoot = '/testproject';

    afterEach(() => vol.reset());

    it('returns null if no project.pbxproj exists', () => {
      vol.mkdirSync(projectRoot, { recursive: true });
      const bundleId = getBundleIdentifierFromPbxproj(projectRoot, platform, {
        targetName: 'testproject',
      });
      expect(bundleId).toBeNull();
    });

    it('returns the bundle identifier defined in project.pbxproj', () => {
      vol.fromJSON(
        {
          'ios/HelloWorld.xcodeproj/project.pbxproj':
            rnFixture['ios/HelloWorld.xcodeproj/project.pbxproj'],
        },
        projectRoot
      );
      const bundleId = getBundleIdentifierFromPbxproj(projectRoot, platform, {
        targetName: 'HelloWorld',
      });
      expect(bundleId).toBe('org.name.HelloWorld');
    });

    describe('multi-target project', () => {
      it('returns correct bundle identifier for the default build configuration (Release)', () => {
        vol.fromJSON(
          {
            'ios/testproject.xcodeproj/project.pbxproj':
              originalFs.readFileSync(
                path.join(__dirname, 'fixtures/project-multitarget.pbxproj'),
                'utf-8'
              ),
            'ios/testproject.xcodeproj/xcshareddata/xcschemes/multitarget.xcscheme':
              originalFs.readFileSync(
                path.join(__dirname, 'fixtures/multitarget.xcscheme'),
                'utf-8'
              ),
          },
          projectRoot
        );
        const bundleId = getBundleIdentifierFromPbxproj(projectRoot, platform, {
          targetName: 'multitarget',
        });
        expect(bundleId).toBe('com.swmansion.dominik.multitarget');
      });

      it('returns correct bundle identifier for Debug build configuration', () => {
        vol.fromJSON(
          {
            'ios/testproject.xcodeproj/project.pbxproj':
              originalFs.readFileSync(
                path.join(__dirname, 'fixtures/project-multitarget.pbxproj'),
                'utf-8'
              ),
            'ios/testproject.xcodeproj/xcshareddata/xcschemes/multitarget.xcscheme':
              originalFs.readFileSync(
                path.join(__dirname, 'fixtures/multitarget.xcscheme'),
                'utf-8'
              ),
          },
          projectRoot
        );
        const bundleId = getBundleIdentifierFromPbxproj(projectRoot, platform, {
          targetName: 'multitarget',
          buildConfiguration: 'Debug',
        });
        expect(bundleId).toBe('com.swmansion.dominik.multitarget.debug');
      });
    });
  });

  describe(setBundleIdentifier, () => {
    it('sets the CFBundleShortVersionString if bundleIdentifier is given', () => {
      expect(
        setBundleIdentifier(
          { ...baseExpoConfig, ios: { bundleIdentifier: 'host.exp.exponent' } },
          {}
        )
      ).toMatchObject({
        CFBundleIdentifier: 'host.exp.exponent',
      });
    });

    it('makes no changes to the infoPlist no bundleIdentifier is provided', () => {
      expect(setBundleIdentifier(baseExpoConfig, {})).toMatchObject({});
    });
  });

  describe(setBundleIdentifierForPbxproj, () => {
    const projectRoot = '/testproject';
    const pbxProjPath = 'ios/testproject.xcodeproj/project.pbxproj';
    const otherPbxProjPath = 'ios/otherproject.xcodeproj/project.pbxproj';

    beforeEach(() => {
      vol.fromJSON(
        {
          [pbxProjPath]: rnFixture['ios/HelloWorld.xcodeproj/project.pbxproj'],
          [otherPbxProjPath]:
            rnFixture['ios/HelloWorld.xcodeproj/project.pbxproj'],
        },
        projectRoot
      );
    });
    afterEach(() => vol.reset());

    it('sets the bundle identifier in the pbxproj file', () => {
      setBundleIdentifierForPbxproj(
        projectRoot,
        platform,
        'com.swmansion.dominik.abcd.v2'
      );
      const pbxprojContents = memfs.readFileSync(
        path.join(projectRoot, pbxProjPath),
        'utf-8'
      );
      const otherPbxprojContents = memfs.readFileSync(
        path.join(projectRoot, otherPbxProjPath),
        'utf-8'
      );
      expect(pbxprojContents).toMatchSnapshot();
      // Ensure all paths are modified
      expect(pbxprojContents).toBe(otherPbxprojContents);
    });
  });
});
