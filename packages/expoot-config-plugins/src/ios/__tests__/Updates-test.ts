import '../../../_mocks/fs.js';

import type FS from 'node:fs';
import * as path from 'node:path';

import * as Updates from '@expo/config-plugins/build/ios/Updates';
import type { resolveConfigPluginFunctionWithInfo as resolveConfigPluginFunctionWithInfoType } from '@expo/config-plugins/build/utils/plugin-resolver';
import type { ExpoConfig as ExpoConfigUpstream } from '@expo/config-types';
import { vol } from 'memfs';

const fsReal: typeof FS = await vi.importActual('node:fs');

vi.mock(
  import('@expo/config-plugins/build/utils/plugin-resolver'),
  async (_importOriginal) => {
    // Avoid importing the original, because it involves dynamic require()
    // statements, which vite-plugin-commonjs draws the line at.

    return {
      resolveConfigPluginFunctionWithInfo: vi.fn<
        typeof resolveConfigPluginFunctionWithInfoType
      >((_projectRoot: string, _pluginReference: string) => {
        return {
          plugin: (config: ExpoConfigUpstream, _props: unknown) => config,
          pluginFile: '',
          pluginReference: '',
          isPluginFile: false,
        };
      }),
    };
  }
);

const fixturesPath = path.resolve(__dirname, 'fixtures');
const sampleCodeSigningCertificatePath = path.resolve(
  fixturesPath,
  'codeSigningCertificate.pem'
);

describe('iOS Updates config', () => {
  beforeEach(() => {
    vol.reset();
  });

  it('sets the correct values in Expo.plist', async () => {
    vol.fromJSON({
      '/app/hello': fsReal.readFileSync(
        sampleCodeSigningCertificatePath,
        'utf-8'
      ),
    });

    const config = await Updates.setUpdatesConfigAsync(
      '/app',
      {
        sdkVersion: '37.0.0',
        runtimeVersion: {
          policy: 'sdkVersion',
        },
        slug: 'my-app',
        owner: 'owner',
        updates: {
          enabled: false,
          fallbackToCacheTimeout: 2000,
          checkAutomatically: 'ON_ERROR_RECOVERY',
          useEmbeddedUpdate: false,
          codeSigningCertificate: 'hello',
          codeSigningMetadata: {
            alg: 'rsa-v1_5-sha256',
            keyid: 'test',
          },
          requestHeaders: {
            'expo-channel-name': 'test',
            testheader: 'test',
          },
        },
      },
      {} as any,
      '0.11.0'
    );

    expect(config).toMatchObject({
      EXUpdatesEnabled: false,
      EXUpdatesCheckOnLaunch: 'ERROR_RECOVERY_ONLY',
      EXUpdatesLaunchWaitMs: 2000,
      EXUpdatesRuntimeVersion: 'exposdk:37.0.0',
      EXUpdatesHasEmbeddedUpdate: false,
      EXUpdatesCodeSigningCertificate: fsReal.readFileSync(
        sampleCodeSigningCertificatePath,
        'utf-8'
      ),
      EXUpdatesCodeSigningMetadata: { alg: 'rsa-v1_5-sha256', keyid: 'test' },
      EXUpdatesRequestHeaders: {
        'expo-channel-name': 'test',
        testheader: 'test',
      },
    });
  });
});
