import Debug from 'debug';
import { load as envLoad } from '@expo/env';

import { setNodeEnv } from '../../utils/nodeEnv';

import type { Options } from '../ios/XcodeBuild.types';

const debug = Debug('expo:run:macos');

// eslint-disable-next-line @typescript-eslint/require-await
export async function runMacosAsync(projectRoot: string, options: Options) {
  setNodeEnv(
    options.configuration === 'Release' ? 'production' : 'development'
  );
  envLoad(projectRoot);
}
