import '../../../_mocks/fs.js';

import type FS from 'node:fs';
import * as fs from 'node:fs';
import * as path from 'node:path';

import plist from '@expo/plist';
import { vol } from 'memfs';

import { readAllFiles } from '../../plugins/__tests__/fixtures/react-native-project';

import {
  ensureApplicationTargetEntitlementsFileConfigured,
  getEntitlementsPath,
} from '../Entitlements';

const fsReal: typeof FS = await vi.importActual('node:fs');
const rnFixture = readAllFiles(fsReal);

const exampleEntitlements = `<?xml version="0.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>special</key>
	<true/>
</dict>
</plist>`;

describe(ensureApplicationTargetEntitlementsFileConfigured, () => {
  const projectRoot = '/app';
  const platform = 'ios';

  afterEach(() => {
    vol.reset();
  });

  it('creates a new entitlements file when none exists', async () => {
    vol.fromJSON(rnFixture, projectRoot);
    const entitlementsPathBefore = getEntitlementsPath(projectRoot, platform);
    ensureApplicationTargetEntitlementsFileConfigured(projectRoot, platform);
    const entitlementsPath = getEntitlementsPath(projectRoot, platform);
    expect(entitlementsPathBefore).toBeNull();
    expect(entitlementsPath).toBe(
      '/app/ios/HelloWorld/HelloWorld.entitlements'
    );

    // New file has the contents of the old entitlements file
    const data = plist.parse(
      await fs.promises.readFile(entitlementsPath!, 'utf8')
    );
    expect(data).toStrictEqual({
      // No entitlements enabled by default
    });
  });

  it('creates a new entitlements file if file in XCBuildConfiguration does not exists', async () => {
    vol.fromJSON(
      {
        'ios/testproject.xcodeproj/project.pbxproj': fsReal.readFileSync(
          path.join(__dirname, 'fixtures/project-with-entitlements.pbxproj'),
          'utf-8'
        ),
        'ios/testproject/AppDelegate.m': '',
      },
      projectRoot
    );
    ensureApplicationTargetEntitlementsFileConfigured(projectRoot, platform);
    const entitlementsPath = getEntitlementsPath(projectRoot, platform);
    expect(entitlementsPath).toBe(
      '/app/ios/testproject/testproject.entitlements'
    );

    // New file has the contents of the old entitlements file
    const data = plist.parse(
      await fs.promises.readFile(entitlementsPath!, 'utf8')
    );
    expect(data).toStrictEqual({});
  });

  it('does not create any entitlements files if it already exists', async () => {
    vol.fromJSON(
      {
        'ios/testproject.xcodeproj/project.pbxproj': fsReal.readFileSync(
          path.join(__dirname, 'fixtures/project-with-entitlements.pbxproj'),
          'utf-8'
        ),
        'ios/testapp/example.entitlements': exampleEntitlements,
        'ios/testproject/AppDelegate.m': '',
      },
      projectRoot
    );
    ensureApplicationTargetEntitlementsFileConfigured(projectRoot, platform);
    const entitlementsPath = getEntitlementsPath(projectRoot, platform);
    expect(entitlementsPath).toBe('/app/ios/testapp/example.entitlements');

    // New file has the contents of the old entitlements file
    const data = plist.parse(
      await fs.promises.readFile(entitlementsPath!, 'utf8')
    );
    expect(data).toStrictEqual({ special: true });

    // entitlement file in default location does not exist
    expect(fs.existsSync('/app/ios/testproject/testproject.entitlements')).toBe(
      false
    );
  });
});

describe(getEntitlementsPath, () => {
  const projectRoot = '/app';
  const platform = 'ios';

  afterEach(() => {
    vol.reset();
  });

  it('returns null if CODE_SIGN_ENTITLEMENTS is not specified', async () => {
    vol.fromJSON(
      {
        'ios/testproject.xcodeproj/project.pbxproj':
          rnFixture['ios/HelloWorld.xcodeproj/project.pbxproj'],
        'ios/testproject/AppDelegate.m': '',
      },
      projectRoot
    );

    const entitlementsPath = getEntitlementsPath(projectRoot, platform);
    expect(entitlementsPath).toBeNull();
  });
  it('returns path if CODE_SIGN_ENTITLEMENTS is specified and file exists', async () => {
    vol.fromJSON(
      {
        'ios/testproject.xcodeproj/project.pbxproj': fsReal.readFileSync(
          path.join(__dirname, 'fixtures/project-with-entitlements.pbxproj'),
          'utf-8'
        ),
        'ios/testapp/example.entitlements': exampleEntitlements,
        'ios/testproject/AppDelegate.m': '',
      },
      projectRoot
    );

    const entitlementsPath = getEntitlementsPath(projectRoot, platform);
    expect(entitlementsPath).toBe('/app/ios/testapp/example.entitlements');
  });
});
