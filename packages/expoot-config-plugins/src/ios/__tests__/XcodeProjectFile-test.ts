import '../../../_mocks/fs.js';

import type FS from 'node:fs';
import * as path from 'node:path';

import { createBuildSourceFile } from '@expo/config-plugins/build/ios/XcodeProjectFile';
import { vol } from 'memfs';

import { readAllFiles } from '../../plugins/__tests__/fixtures/react-native-project';

import { getPbxproj } from '../utils/Xcodeproj';

const fsActual: typeof FS = await vi.importActual('node:fs');
const rnFixture = readAllFiles(fsActual);

// Gotta skip this because `node_modules/xcode/lib/pbxProject.js` writes
// `for (key in sections)`, which the runtime can't parse.
describe.skip(createBuildSourceFile, () => {
  const projectRoot = '/alpha';
  const platform = 'ios';
  beforeAll(async () => {
    vol.fromJSON(rnFixture, projectRoot);
  });

  afterAll(() => {
    vol.reset();
  });

  it('creates a source file', () => {
    const project = getPbxproj(projectRoot, platform);
    // perform action
    createBuildSourceFile({
      project,
      nativeProjectRoot: path.join(projectRoot, platform),
      filePath: 'HelloWorld/myfile.swift',
      fileContents: '// hello',
    });

    expect(project.hasFile('HelloWorld/myfile.swift')).toStrictEqual({
      explicitFileType: undefined,
      fileEncoding: 4,
      includeInIndex: 0,
      isa: 'PBXFileReference',
      lastKnownFileType: 'sourcecode.swift',
      name: '"myfile.swift"',
      path: '"HelloWorld/myfile.swift"',
      sourceTree: '"<group>"',
    });

    expect(
      vol.existsSync(
        path.join(projectRoot, platform, 'HelloWorld/myfile.swift')
      )
    ).toBe(true);
  });
});
