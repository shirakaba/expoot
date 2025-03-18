import { AppleDeviceManager } from '@expo/cli/build/src/start/platforms/ios/AppleDeviceManager.js';
import type { Device } from '@expo/cli/build/src/start/platforms/ios/simctl.js';

import { AppIdResolver } from '../AppIdResolver';
import { BaseOpenInCustomProps, PlatformManager } from '../PlatformManager';

import { AppleAppIdResolver } from './AppleAppIdResolver';

/** Manages launching apps on Apple simulators. */
export class ApplePlatformManager extends PlatformManager<Device> {
  constructor(
    protected projectRoot: string,
    protected port: number,
    options: {
      /** Get the base URL for the dev server hosting this platform manager. */
      getDevServerUrl: () => string | null;
      /** Expo Go URL. */
      getExpoGoUrl: () => string;
      /** Get redirect URL for native disambiguation. */
      getRedirectUrl: () => string | null;
      /** Dev Client */
      getCustomRuntimeUrl: (props?: { scheme?: string }) => string | null;
    }
  ) {
    super(projectRoot, {
      platform: 'ios',
      ...options,
      // eslint-disable-next-line @typescript-eslint/unbound-method
      resolveDeviceAsync: AppleDeviceManager.resolveAsync,
    });
  }

  async openAsync(
    options:
      | { runtime: 'expo' | 'web' }
      | { runtime: 'custom'; props?: Partial<BaseOpenInCustomProps> },
    resolveSettings?: Partial<{ shouldPrompt?: boolean; device?: Device }>
  ): Promise<{ url: string }> {
    await AppleDeviceManager.assertSystemRequirementsAsync();
    return super.openAsync(options, resolveSettings);
  }

  _getAppIdResolver(): AppIdResolver {
    return new AppleAppIdResolver(this.projectRoot, this.props.platform);
  }

  _resolveAlternativeLaunchUrl(
    applicationId: string,
    props?: Partial<BaseOpenInCustomProps>
  ): string {
    return applicationId;
  }
}
