import '../../../_mocks/fs.js';

import * as fs from 'node:fs';
import type FS from 'node:fs';
import * as path from 'node:path';

import { vol } from 'memfs';

import { readAllFiles } from '../../plugins/__tests__/fixtures/react-native-project';

import { setProvisioningProfileForPbxproj } from '../ProvisioningProfile';

const originalFs: typeof FS = await vi.importActual('node:fs');
const rnFixture = readAllFiles(originalFs);

describe('ProvisioningProfile module', () => {
  describe(setProvisioningProfileForPbxproj, () => {
    const projectRoot = '/testproject';
    const platform = 'ios';
    const pbxProjPath = `${platform}/testproject.xcodeproj/project.pbxproj`;

    afterEach(() => {
      vol.reset();
    });

    describe('multitarget', () => {
      it('configures the project.pbxproj file for multitarget projects', () => {
        vol.fromJSON(
          {
            [pbxProjPath]: originalFs.readFileSync(
              path.join(__dirname, 'fixtures/project-multitarget.pbxproj'),
              'utf-8'
            ),
          },
          projectRoot
        );
        setProvisioningProfileForPbxproj(projectRoot, platform, {
          targetName: 'multitarget',
          profileName:
            '*[expo] com.swmansion.dominik.abcd.v2 AppStore 2020-07-24T07:56:22.983Z',
          appleTeamId: 'J5FM626PE2',
        });
        const pbxprojContents = fs.readFileSync(
          path.join(projectRoot, pbxProjPath),
          'utf-8'
        );
        expect(pbxprojContents).toMatchSnapshot();
      });

      it('configures the project.pbxproj file for multitarget projects without existing target attributes', () => {
        vol.fromJSON(
          {
            [pbxProjPath]: originalFs.readFileSync(
              path.join(
                __dirname,
                'fixtures/project-multitarget-missing-targetattributes.pbxproj'
              ),
              'utf-8'
            ),
          },
          projectRoot
        );
        setProvisioningProfileForPbxproj(projectRoot, platform, {
          targetName: 'multitarget',
          profileName:
            '*[expo] com.swmansion.dominik.abcd.v2 AppStore 2020-07-24T07:56:22.983Z',
          appleTeamId: 'J5FM626PE2',
        });
        const pbxprojContents = fs.readFileSync(
          path.join(projectRoot, pbxProjPath),
          'utf-8'
        );
        expect(pbxprojContents).toMatchSnapshot();
      });
    });

    describe('single target', () => {
      beforeEach(() => {
        vol.fromJSON(
          {
            [pbxProjPath]:
              rnFixture['ios/HelloWorld.xcodeproj/project.pbxproj'],
          },
          projectRoot
        );
      });

      it('configures the project.pbxproj file with the profile name and apple team id', () => {
        setProvisioningProfileForPbxproj(projectRoot, platform, {
          profileName:
            '*[expo] com.swmansion.dominik.abcd.v2 AppStore 2020-07-24T07:56:22.983Z',
          appleTeamId: 'J5FM626PE2',
        });
        const pbxprojContents = fs.readFileSync(
          path.join(projectRoot, pbxProjPath),
          'utf-8'
        );
        expect(pbxprojContents).toMatchSnapshot();
      });

      // eslint-disable-next-line vitest/no-identical-title
      it('configures the project.pbxproj file with the profile name and apple team id', () => {
        setProvisioningProfileForPbxproj(projectRoot, platform, {
          profileName:
            '*[expo] com.swmansion.dominik.abcd.v2 AppStore 2020-07-24T07:56:22.983Z',
          appleTeamId: 'Something Spaced',
        });
        const pbxprojContents = fs.readFileSync(
          path.join(projectRoot, pbxProjPath),
          'utf-8'
        );
        expect(pbxprojContents).toMatch(
          /DevelopmentTeam = "Something Spaced";/
        );
      });
      it('throws descriptive error when target name does not exist', () => {
        expect(() =>
          setProvisioningProfileForPbxproj(projectRoot, platform, {
            targetName: 'faketargetname',
            profileName:
              '*[expo] com.swmansion.dominik.abcd.v2 AppStore 2020-07-24T07:56:22.983Z',
            appleTeamId: 'J5FM626PE2',
          })
        ).toThrow("Could not find target 'faketargetname' in project.pbxproj");
      });
    });
  });
});
