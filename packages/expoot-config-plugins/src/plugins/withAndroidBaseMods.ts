import { withAndroidBaseMods as upstreamWithAndroidBaseMods } from '@expo/config-plugins/build/plugins/withAndroidBaseMods';

import type { ExportedConfig } from '../Plugin.types';

export const withAndroidBaseMods = upstreamWithAndroidBaseMods as (
  config: ExportedConfig,
  forwardedBaseModOptions?: Parameters<typeof upstreamWithAndroidBaseMods>[1]
) => ExportedConfig;

export {
  sortAndroidManifest,
  getAndroidModFileProviders,
} from '@expo/config-plugins/build/plugins/withAndroidBaseMods';
