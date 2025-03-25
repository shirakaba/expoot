import '../../../_mocks/fs.js';

import type FS from 'node:fs';
import * as path from 'node:path';

import { vol } from 'memfs';

import { setPrivacyInfo, PrivacyInfo } from '../PrivacyInfo';

const originalFs: typeof FS = await vi.importActual('node:fs');

vi.mock(import('../utils/Xcodeproj'), async (importOriginal) => {
  const mod = await importOriginal();

  return {
    ...mod,
    getProjectName: () => 'testproject',
    addResourceFileToGroup: vi.fn(),
  };
});

const projectRoot = 'myapp';

const project = {
  name: 'test',
  slug: 'test',
};

const mockConfig = {
  //fill in relevant data here
  modResults: {
    hasFile: () => false,
  },
  modRequest: {
    projectRoot,
    platformProjectRoot: path.join(projectRoot, 'ios'),
    modName: 'test',
    platform: 'ios' as const,
    introspect: false,
  },
  modRawConfig: project,
  ...project,
} as any;

const privacyManifests: PrivacyInfo = {
  NSPrivacyAccessedAPITypes: [
    {
      NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryTestCategory',
      NSPrivacyAccessedAPITypeReasons: ['TEST.TEST'],
    },
  ],
  NSPrivacyCollectedDataTypes: [],
  NSPrivacyTracking: true,
  NSPrivacyTrackingDomains: ['test.com'],
};

const filePath = 'ios/testproject/PrivacyInfo.xcprivacy';

describe('withPrivacyInfo', () => {
  afterEach(() => vol.reset());
  it('adds PrivacyInfo.xcprivacy file to the project and merges with existing file', async () => {
    // mock the data in the PrivacyInfo.xcprivacy file using vol
    vol.fromJSON(
      {
        [filePath]: originalFs.readFileSync(
          path.join(__dirname, 'fixtures/PrivacyInfo.xcprivacy'),
          'utf-8'
        ),
      },
      projectRoot
    );

    setPrivacyInfo(mockConfig, privacyManifests);
    expect(
      vol.readFileSync(path.join(projectRoot, filePath), 'utf-8')
    ).toMatchSnapshot();
  });
});
