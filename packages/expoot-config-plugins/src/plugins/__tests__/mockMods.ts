import type { ExpoConfig } from '@expo/config';
import type { MockInstance } from '@vitest/spy';

import type {
  ConfigPlugin,
  ExportedConfigWithProps,
  Mod,
} from '../../Plugin.types';

// Usage: add the following mock to the mods you are using:
// jest.mock('../../plugins/android-plugins');

export function mockModWithResults(withMod: MockInstance, modResults: any) {
  withMod.mockImplementationOnce((config: any, action: any) => {
    return action({ ...config, modResults });
  });
}

/**
 * Mock a single mod and evaluate the plugin that uses that mod
 * @param config
 * @param param1
 * @returns
 */
export async function compileMockModWithResultsAsync<T>(
  config: Partial<ExpoConfig>,
  {
    mod,
    plugin,
    modResults,
  }: {
    mod: MockInstance<ConfigPlugin<Mod<T>>>;
    plugin: ConfigPlugin;
    modResults: T;
  }
): Promise<ExportedConfigWithProps<T>> {
  mockModWithResults(mod, modResults);
  // eslint-disable-next-line @typescript-eslint/await-thenable
  return (await plugin(config as any)) as ExportedConfigWithProps<T>;
}
