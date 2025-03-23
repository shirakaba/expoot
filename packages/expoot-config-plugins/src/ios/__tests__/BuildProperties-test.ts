import '../../../_mocks/fs.js';

import {
  updateIosBuildPropertiesFromConfig,
  updateIosBuildProperty,
  withJsEnginePodfileProps,
} from '@expo/config-plugins/build/ios/BuildProperties';
import type * as BuildProperties from '@expo/config-plugins/build/ios/BuildProperties';
import { withPodfileProperties } from '@expo/config-plugins/build/plugins/ios-plugins';
import type { MockInstance } from 'vitest';

import type { ConfigPlugin, Mod } from '../../Plugin.types';
import { compileMockModWithResultsAsync } from '../../plugins/__tests__/mockMods';

vi.mock('@expo/config-plugins/build/plugins/ios-plugins');
vi.mock('@expo/config-plugins/build/ios/BuildProperties');

const BuildPropertiesActual: typeof BuildProperties = await vi.importActual(
  '@expo/config-plugins/build/ios/BuildProperties'
);

describe(withJsEnginePodfileProps, () => {
  const JS_ENGINE_PROP_KEY = 'expo.jsEngine';

  it('set the property from shared `jsEngine` config', async () => {
    const { modResults } = await compileMockModWithResultsAsync(
      { jsEngine: 'hermes' },
      {
        plugin:
          BuildPropertiesActual.withJsEnginePodfileProps as unknown as ConfigPlugin<void>,
        mod: withPodfileProperties as unknown as MockInstance<
          ConfigPlugin<Mod<{}>>
        >,
        modResults: {},
      }
    );
    expect(modResults).toMatchObject({
      [JS_ENGINE_PROP_KEY]: 'hermes',
    });
  });

  it('set the property from platform override `jsEngine`', async () => {
    const { modResults } = await compileMockModWithResultsAsync(
      { jsEngine: 'hermes', ios: { jsEngine: 'jsc' } },
      {
        plugin:
          BuildPropertiesActual.withJsEnginePodfileProps as unknown as ConfigPlugin<void>,
        mod: withPodfileProperties as unknown as MockInstance<
          ConfigPlugin<Mod<{}>>
        >,
        modResults: {},
      }
    );
    expect(modResults).toMatchObject({
      [JS_ENGINE_PROP_KEY]: 'jsc',
    });
  });

  it('overwrite the property if an old property is existed', async () => {
    const { modResults } = await compileMockModWithResultsAsync(
      { jsEngine: 'hermes' },
      {
        plugin:
          BuildPropertiesActual.withJsEnginePodfileProps as unknown as ConfigPlugin<void>,
        mod: withPodfileProperties as unknown as MockInstance<
          ConfigPlugin<Mod<{}>>
        >,
        modResults: { [JS_ENGINE_PROP_KEY]: 'jsc' } as Record<string, string>,
      }
    );
    expect(modResults).toMatchObject({
      [JS_ENGINE_PROP_KEY]: 'hermes',
    });
  });
});

describe(updateIosBuildPropertiesFromConfig, () => {
  it('should respect `propValueGetter` order', () => {
    const podfileProperties = {};
    const configToPropertyRules = [
      {
        propName: 'expo.jsEngine',
        propValueGetter: (config: any) =>
          config.ios?.jsEngine ?? config.jsEngine ?? 'NOTFOUND',
      },
    ];

    expect(
      BuildPropertiesActual.updateIosBuildPropertiesFromConfig(
        { jsEngine: 'hermes', ios: { jsEngine: 'jsc' } },
        podfileProperties,
        configToPropertyRules
      )
    ).toMatchObject({
      'expo.jsEngine': 'jsc',
    });

    expect(
      BuildPropertiesActual.updateIosBuildPropertiesFromConfig(
        { jsEngine: 'jsc' },
        podfileProperties,
        configToPropertyRules
      )
    ).toMatchObject({
      'expo.jsEngine': 'jsc',
    });

    expect(
      BuildPropertiesActual.updateIosBuildPropertiesFromConfig(
        {},
        podfileProperties,
        configToPropertyRules
      )
    ).toMatchObject({
      'expo.jsEngine': 'NOTFOUND',
    });
  });
});

describe(updateIosBuildProperty, () => {
  it('should merge properties', () => {
    const podfileProperties = {
      foo: 'foo',
      bar: 'bar',
      name: 'oldName',
    };
    expect(
      BuildPropertiesActual.updateIosBuildProperty(
        podfileProperties,
        'name',
        'newName'
      )
    ).toEqual({
      foo: 'foo',
      bar: 'bar',
      name: 'newName',
    });
  });

  it('should keep original property when `value` is null by default', () => {
    const podfileProperties = {
      foo: 'foo',
      bar: 'bar',
    };
    expect(
      BuildPropertiesActual.updateIosBuildProperty(
        podfileProperties,
        'bar',
        null
      )
    ).toEqual({
      foo: 'foo',
      bar: 'bar',
    });
  });

  it('should remove original property when `value` is null when `removePropWhenValueIsNull` is true', () => {
    const podfileProperties = {
      foo: 'foo',
      bar: 'bar',
    };
    expect(
      BuildPropertiesActual.updateIosBuildProperty(
        podfileProperties,
        'bar',
        null,
        {
          removePropWhenValueIsNull: true,
        }
      )
    ).toEqual({
      foo: 'foo',
    });
  });
});
