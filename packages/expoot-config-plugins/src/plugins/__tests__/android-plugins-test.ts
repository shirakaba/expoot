import '../../../_mocks/fs.js';

import * as fs from 'node:fs';
import type FS from 'node:fs';
import * as path from 'node:path';

import { withGradleProperties } from '@expo/config-plugins/build/plugins/android-plugins';
import type { ExpoConfig as UpstreamExpoConfig } from '@expo/config-types';
import { vol } from 'memfs';

import { readAllFiles } from '../../plugins/__tests__/fixtures/react-native-project';

import { evalModsAsync } from '../mod-compiler';
import {
  getAndroidModFileProviders,
  withAndroidBaseMods,
} from '../withAndroidBaseMods';

const fsActual: typeof FS = await vi.importActual('node:fs');
const rnFixture = readAllFiles(fsActual);

describe(withGradleProperties, () => {
  const projectRoot = '/app';

  beforeEach(async () => {
    vol.fromJSON(rnFixture, projectRoot);
  });

  afterEach(() => {
    vol.reset();
  });

  it('is passed gradle.properties', async () => {
    let config: UpstreamExpoConfig = {
      name: 'foobar',
      slug: 'foobar',
    };

    config = withGradleProperties(config, (config) => {
      config.modResults.push({ type: 'comment', value: 'expo-test' });
      config.modResults.push({ type: 'empty' });
      config.modResults.push({ type: 'property', key: 'foo', value: 'bar' });
      config.modResults.push({ type: 'empty' });
      config.modResults.push({ type: 'comment', value: 'end-expo-test' });
      return config;
    });
    config = withAndroidBaseMods(config, {
      providers: {
        gradleProperties: getAndroidModFileProviders().gradleProperties,
      },
    }) as UpstreamExpoConfig;

    await evalModsAsync(config, {
      projectRoot,
      platforms: ['android'],
      assertMissingModProviders: true,
    });

    const contents = fs.readFileSync(
      path.join(projectRoot, 'android/gradle.properties'),
      'utf8'
    );
    expect(contents.endsWith('# expo-test\n\nfoo=bar\n\n# end-expo-test')).toBe(
      true
    );
  });
});
