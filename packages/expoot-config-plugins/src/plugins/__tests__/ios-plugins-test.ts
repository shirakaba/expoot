import type FS from 'node:fs';

import { createInfoPlistPluginWithPropertyGuard } from '@expo/config-plugins/build/plugins/ios-plugins';
import type { resolveConfigPluginFunctionWithInfo as resolveConfigPluginFunctionWithInfoType } from '@expo/config-plugins/build/utils/plugin-resolver';
import { addWarningIOS } from '@expo/config-plugins/build/utils/warnings';
import type { ExpoConfig as UpstreamExpoConfig } from '@expo/config-types';
import type { MockedFunction } from '@vitest/spy';
import { vol } from 'memfs';

import { readAllFiles } from '../../plugins/__tests__/fixtures/react-native-project';

import { evalModsAsync } from '../mod-compiler';
import { getIosModFileProviders, withIosBaseMods } from '../withIosBaseMods';

const fsActual: typeof FS = await vi.importActual('node:fs');
const rnFixture = readAllFiles(fsActual);

vi.mock(
  import('@expo/config-plugins/build/utils/warnings'),
  async (importOriginal) => {
    const mod = await importOriginal();

    return {
      ...mod,
      addWarningIOS: vi.fn(),
    };
  }
);

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
          plugin: (config: UpstreamExpoConfig, _props: unknown) => config,
          pluginFile: '',
          pluginReference: '',
          isPluginFile: false,
        };
      }),
    };
  }
);

export const asMock = <T extends (...args: any[]) => any>(
  fn: T
): MockedFunction<T> => fn as MockedFunction<T>;

describe(createInfoPlistPluginWithPropertyGuard, () => {
  const projectRoot = '/app';

  beforeEach(async () => {
    asMock(addWarningIOS).mockClear();
    vol.fromJSON(rnFixture, projectRoot);
  });

  afterEach(() => {
    vol.reset();
  });

  it('respects info plist manual values', async () => {
    const setter = vi.fn();
    const withPlugin = createInfoPlistPluginWithPropertyGuard(setter, {
      infoPlistProperty: 'CFFakeValue',
      // Supports nesting
      expoConfigProperty: 'ios.appStoreUrl',
    });

    let config: UpstreamExpoConfig = {
      name: 'hey',
      slug: '',
      ios: {
        appStoreUrl: 'underlying',
        infoPlist: {
          CFFakeValue: false,
        },
      },
    };

    config = withPlugin(config);

    config = withIosBaseMods(config, {
      providers: {
        infoPlist: getIosModFileProviders().infoPlist,
      },
    }) as UpstreamExpoConfig;

    const results = await evalModsAsync(config, {
      projectRoot,
      platforms: ['ios'],
      introspect: true,
      assertMissingModProviders: true,
    });

    expect(results.ios!.infoPlist!.CFFakeValue).toEqual(false);

    expect(setter).not.toBeCalled();
    expect(addWarningIOS).toBeCalledWith(
      'ios.appStoreUrl',
      '"ios.infoPlist.CFFakeValue" is set in the config. Ignoring abstract property "ios.appStoreUrl": underlying'
    );
  });

  it('does not warn about info plist overrides if the abstract value is not defined', async () => {
    const setter = vi.fn();
    const withPlugin = createInfoPlistPluginWithPropertyGuard(setter, {
      infoPlistProperty: 'CFFakeValue',
      expoConfigProperty: 'foobar',
    });

    let config: UpstreamExpoConfig = {
      name: 'hey',
      slug: '',
      ios: {
        infoPlist: {
          CFFakeValue: false,
        },
      },
    };

    config = withPlugin(config);

    config = withIosBaseMods(config, {
      providers: {
        infoPlist: getIosModFileProviders().infoPlist,
      },
    }) as UpstreamExpoConfig;

    const results = await evalModsAsync(config, {
      projectRoot,
      platforms: ['ios'],
      introspect: true,
      assertMissingModProviders: true,
    });

    expect(results.ios!.infoPlist!.CFFakeValue).toEqual(false);

    expect(setter).not.toBeCalled();
    expect(addWarningIOS).not.toBeCalled();
  });

  it('uses default behavior when not overwritten', async () => {
    const setter = vi.fn();
    const withPlugin = createInfoPlistPluginWithPropertyGuard(setter, {
      infoPlistProperty: 'CFFakeValue',
      expoConfigProperty: 'name',
    });

    let config: UpstreamExpoConfig = {
      name: 'hey',
      slug: '',
      ios: {
        infoPlist: {},
      },
    };

    config = withPlugin(config);

    config = withIosBaseMods(config, {
      providers: {
        infoPlist: getIosModFileProviders().infoPlist,
      },
    }) as UpstreamExpoConfig;

    await evalModsAsync(config, {
      projectRoot,
      platforms: ['ios'],
      introspect: true,
      assertMissingModProviders: true,
    });

    expect(setter).toBeCalled();
    expect(addWarningIOS).not.toBeCalled();
  });
});
