import '../../../_mocks/fs.js';

import type FS from 'node:fs';
import * as path from 'node:path';

import type { ExpoConfig } from '@expoot/config-types';
import { fs as memfs, vol } from 'memfs';

import { readAllFiles } from '../../plugins/__tests__/fixtures/react-native-project';

import {
  getDevelopmentTeam,
  setDevelopmentTeamForPbxproj,
} from '../DevelopmentTeam';

const fsActual: typeof FS = await vi.importActual('node:fs');
const rnFixture = readAllFiles(fsActual);
const __dirname = import.meta.dirname;

const baseExpoConfig: ExpoConfig = {
  name: 'testproject',
  slug: 'testproject',
  platforms: ['ios'],
  version: '1.0.0',
};

describe('DevelopmentTeam module', () => {
  const platform = 'ios';

  describe(getDevelopmentTeam, () => {
    it('returns `null` if no `developmentTeam` is set', () => {
      expect(getDevelopmentTeam(baseExpoConfig)).toBe(null);
    });

    it('returns the `developmentTeam` when provided', () => {
      const expoConfig = {
        ...baseExpoConfig,
        ios: { appleTeamId: 'X0XX00XXXX' },
      };
      expect(getDevelopmentTeam(expoConfig)).toBe('X0XX00XXXX');
    });
  });

  describe(setDevelopmentTeamForPbxproj, () => {
    const projectRoot = '/testproject';
    const pbxProjPath = `${platform}/testproject.xcodeproj/project.pbxproj`;

    afterEach(() => vol.reset());

    it('adds the `DEVELOPMENT_TEAM` to all build configurations when providing a team id', () => {
      const fixtureWithoutDevelopmentTeam =
        rnFixture[`${platform}/HelloWorld.xcodeproj/project.pbxproj`];
      vol.fromJSON(
        { [pbxProjPath]: fixtureWithoutDevelopmentTeam },
        projectRoot
      );

      // Ensure the test fixture has NO development team
      expect(fixtureWithoutDevelopmentTeam).not.toContain('DEVELOPMENT_TEAM');

      // Add the development team
      setDevelopmentTeamForPbxproj(projectRoot, platform, 'X0XX00XXXX');

      // Esnure the development team has been added
      const contents = memfs.readFileSync(
        path.join(projectRoot, pbxProjPath),
        'utf-8'
      );
      expect(contents).toMatchSnapshot();
    });

    it('removes the `DEVELOPMENT_TEAM` from all build configurations without team id', () => {
      const fixtureWithDevelopmentTeam = fsActual.readFileSync(
        path.join(__dirname, 'fixtures/project-multitarget.pbxproj'),
        'utf-8'
      );
      vol.fromJSON({ [pbxProjPath]: fixtureWithDevelopmentTeam }, projectRoot);

      // Ensure the test fixture has a development team
      expect(fixtureWithDevelopmentTeam).toContain('DEVELOPMENT_TEAM');

      // Remove the development team
      setDevelopmentTeamForPbxproj(projectRoot, platform);

      // Ensure the development team has been removed
      const contents = memfs.readFileSync(
        path.join(projectRoot, pbxProjPath),
        'utf-8'
      );
      expect(contents).toMatchSnapshot();
    });
  });
});
