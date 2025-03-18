/* eslint-disable @typescript-eslint/no-explicit-any */

declare module '@expo/cli/build/src/export/embed/exportEager.js' {
  export function exportEagerAsync(
    projectRoot: string,
    options: {
      dev: boolean;
      platform: string;
      resetCache?: boolean;
      assetsDest?: string;
      bundleOutput?: string;
    }
  ): Promise<{
    options: Options;
    key: string;
  }>;
}

declare module '@expo/cli/build/src/log.js' {
  export function time(label?: string): void;
  export function timeEnd(label?: string): void;
  export function error(...message: string[]): void;
  export function exception(e: Error): void;
  export function warn(...message: string[]): void;
  export function log(...message: string[]): void;
  export function debug(...message: string[]): void;
  export function clear(): void;
  export function exit(message: string | Error, code?: number): void;
}

declare module '@expo/cli/build/src/start/platforms/ios/AppleAppIdResolver.js' {
  import { AppIdResolver } from '@expo/cli/build/src/start/platforms/AppIdResolver.js';
  import type { ModPlatform } from '@expo/config-plugins';

  export declare class AppleAppIdResolver extends AppIdResolver {
    constructor(projectRoot: string, platform: ModPlatform);
  }
}

declare module '@expo/cli/build/src/start/platforms/AppIdResolver.js' {
  import type { ModPlatform } from '@expo/config-plugins';

  export declare class AppIdResolver {
    protected projectRoot: string;
    protected platform: ModPlatform;
    protected configProperty: string;
    constructor(
      projectRoot: string,
      platform: ModPlatform,
      configProperty: string
    );
    getAppIdAsync(): Promise<string>;
    hasNativeProjectAsync(): Promise<boolean>;
    getAppIdFromConfigAsync(): Promise<string>;
    resolveAppIdFromNativeAsync(): Promise<string | null>;
    getAppIdFromNativeAsync(): Promise<string>;
  }
}

declare module '@expo/cli/build/src/start/platforms/ios/simctl.js' {
  import type { SpawnOptions, SpawnResult } from '@expo/spawn-async';

  type DeviceState = 'Shutdown' | 'Booted';

  export type OSType = 'iOS' | 'tvOS' | 'watchOS' | 'macOS' | 'xrOS';

  export type Device = {
    availabilityError?: 'runtime profile not found';
    dataPath: string;
    dataPathSize?: number;
    logPath: string;
    logPathSize?: number;
    udid: string;
    runtime: string;
    isAvailable: boolean;
    deviceTypeIdentifier: string;
    state: DeviceState;
    name: string;
    osType: OSType;
    osVersion: string;
    windowName: string;
  };

  type DeviceContext = Pick<Device, 'udid'>;

  export function getContainerPathAsync(
    device: Partial<DeviceContext>,
    { appId }: { appId: string }
  ): Promise<string | null>;

  export function simctlAsync(
    args: (string | undefined)[],
    options?: SpawnOptions
  ): Promise<SpawnResult>;
}

declare module '@expo/cli/build/src/utils/cocoapods.js' {
  export function maybePromptToSyncPodsAsync(
    projectRoot: string
  ): Promise<void>;
}

declare module '@expo/cli/build/src/utils/errors.js' {
  export class CommandError extends Error {
    name: 'CommandError';
    readonly isCommandError: true;
    constructor(code: string, message?: string);
  }

  export class AbortCommandError extends CommandError {
    constructor();
  }

  export class SilentError extends CommandError {
    constructor(messageOrError?: string | Error);
  }

  export function logCmdError(error: any): never;

  export class UnimplementedError extends Error {}
}

declare module '@expo/cli/build/src/utils/nodeEnv.js' {
  export function setNodeEnv(mode: 'development' | 'production'): void;
}

declare module '@expo/cli/build/src/utils/port.js' {
  export function ensurePortAvailabilityAsync(
    projectRoot: string,
    { port }: { port: number }
  ): Promise<boolean>;
}

declare module '@expo/cli/build/src/utils/profile.js' {
  export function profile<T extends (...args: any[]) => any>(
    fn: T,
    functionName: string = fn.name
  ): T;
}

declare module '@expo/cli/build/src/utils/scheme.js' {
  import type { ModPlatform } from '@expo/config-plugins';

  export function getSchemesForIosAsync(
    projectRoot: string,
    platform: ModPlatform
  ): Promise<string[]>;
}

declare module '@expo/cli/build/src/run/ensureNativeProject.js' {
  import type { ModPlatform } from '@expo/config-plugins';

  export function ensureNativeProjectAsync(
    projectRoot: string,
    {
      platform,
      install,
    }: {
      platform: ModPlatform;
      install?: boolean;
    }
  ): Promise<boolean>;
}

declare module '@expo/cli/build/src/run/hints.js' {
  export function logProjectLogsLocation(): void;
}

declare module '@expo/cli/build/src/run/startBundler.js' {
  import type { DevServerManager } from '@expo/cli/src/start/server/DevServerManager.js';

  export function startBundlerAsync(
    projectRoot: string,
    {
      port,
      headless,
      scheme,
    }: {
      port: number;
      headless?: boolean;
      scheme?: string;
    }
  ): Promise<DevServerManager>;
}

declare module '@expo/cli/src/start/server/UrlCreator.js' {
  export interface CreateURLOptions {
    scheme?: string | null;
    hostType?: 'localhost' | 'lan' | 'tunnel';
    hostname?: string | null;
  }
}

declare module '@expo/cli/src/start/server/BundlerDevServer.js' {
  import type { CreateURLOptions } from '@expo/cli/src/start/server/UrlCreator.js';

  export interface BundlerStartOptions {
    https?: boolean;
    mode?: 'development' | 'production';
    devClient?: boolean;
    resetDevServer?: boolean;
    privateKeyPath?: string;
    maxWorkers?: number;
    port?: number;
    headless?: boolean;
    minify?: boolean;
    isExporting?: boolean;
    isImageEditingEnabled?: boolean;
    location: CreateURLOptions;
  }
}

declare module '@expo/cli/src/start/server/DevServerManager.js' {
  import type { BundlerStartOptions } from '@expo/cli/src/start/server/BundlerDevServer.js';
  import type { DevToolsPluginManager } from '@expo/cli/src/start/server/DevToolsPluginManager.js';
  import type { ExpoConfig } from '@expo/config';

  export class DevServerManager {
    static startMetroAsync(
      projectRoot: string,
      startOptions: BundlerStartOptions
    ): Promise<DevServerManager>;

    readonly devtoolsPluginManager: DevToolsPluginManager;

    projectRoot: string;
    options: BundlerStartOptions;

    constructor(projectRoot: string, options: BundlerStartOptions);

    ensureProjectPrerequisiteAsync(
      PrerequisiteClass: typeof ProjectPrerequisite<any, any>
    ): Promise<any>;
    broadcastMessage(
      method: 'reload' | 'devMenu' | 'sendDevCommand',
      params?: Record<string, any>
    );
    getNativeDevServerPort(): number | null;
    getDefaultDevServer(): BundlerDevServer;
    ensureWebDevServerRunningAsync(): Promise<ExpoConfig | undefined>;
    toggleRuntimeMode(isUsingDevClient?: boolean): Promise<boolean>;
    startAsync(startOptions: MultiBundlerStartOptions): Promise<ExpoConfig>;
    bootstrapTypeScriptAsync(): Promise<void>;
    watchEnvironmentVariables(): Promise<void>;
    stopAsync(): Promise<void>;
  }
}

declare module '@expo/cli/src/start/server/DevToolsPluginManager.js' {
  export const DevToolsPluginEndpoint: '/_expo/plugins';

  interface AutolinkingPlugin {
    packageName: string;
    packageRoot: string;
    webpageRoot: string;
  }

  export interface DevToolsPlugin extends AutolinkingPlugin {
    webpageEndpoint: string;
  }

  export class DevToolsPluginManager {
    constructor(projectRoot: string);

    queryPluginsAsync(): Promise<DevToolsPlugin[]>;
    queryPluginWebpageRootAsync(pluginName: string): Promise<string | null>;
  }

  export = DevToolsPluginManager;
}

declare module '@expo/cli/build/src/run/ios/launchApp.js' {
  import type { BuildProps } from '@expo/cli/build/src/run/ios/XcodeBuild.types.js';
  import type { DevServerManager } from '@expo/cli/src/start/server/DevServerManager.js';

  type BinaryLaunchInfo = {
    bundleId: string;
    schemes: string[];
  };

  export function launchAppAsync(
    binaryPath: string,
    manager: DevServerManager,
    props: Pick<BuildProps, 'isSimulator' | 'device' | 'shouldStartBundler'>,
    appId?: string
  ): Promise<void>;

  export function getLaunchInfoForBinaryAsync(
    binaryPath: string
  ): Promise<BinaryLaunchInfo>;
}

declare module '@expo/cli/build/src/run/ios/resolveOptions.js' {
  import type { BuildProps } from '@expo/cli/build/src/run/ios/XcodeBuild.types.js';

  export function resolveOptionsAsync(
    projectRoot: string,
    platform: ModPlatform,
    options: Options
  ): Promise<BuildProps>;
}

declare module '@expo/cli/build/src/run/resolveBundlerProps.js' {
  export interface BundlerProps {
    port: number;
    shouldStartBundler: boolean;
  }

  export function resolveBundlerPropsAsync(
    projectRoot: string,
    options: {
      port?: number;
      bundler?: boolean;
    }
  ): Promise<BundlerProps>;
}

declare module '@expo/cli/build/src/run/ios/validateExternalBinary.js' {
  export function getValidBinaryPathAsync(
    input: string,
    props: { isSimulator: boolean }
  ): Promise<string>;
}

declare module '@expo/cli/build/src/run/ios/XcodeBuild.js' {
  import type { SpawnOptionsWithoutStdio } from 'node:child_process';

  import type { BuildProps } from '@expo/cli/build/src/run/ios/XcodeBuild.types.js';

  export function logPrettyItem(message: string): void;
  export function matchEstimatedBinaryPath(buildOutput: string): string | null;
  export function getAppBinaryPath(buildOutput: string): string;
  export function getEscapedPath(filePath: string): string;
  export function extractEnvVariableFromBuild(
    buildOutput: string,
    variableName: string
  ): string[];
  export function getProcessOptions(args: {
    packager: boolean;
    shouldSkipInitialBundling?: boolean;
    terminal: string | undefined;
    port: number;
    eagerBundleOptions?: string;
  }): SpawnOptionsWithoutStdio;
  export function getXcodeBuildArgsAsync(
    props: Pick<
      BuildProps,
      | 'platform'
      | 'buildCache'
      | 'projectRoot'
      | 'xcodeProject'
      | 'configuration'
      | 'scheme'
      | 'device'
      | 'isSimulator'
    >
  ): Promise<string[]>;
  export function buildAsync(props: BuildProps): Promise<string>;
  export function _assertXcodeBuildResults(
    code: number | null,
    results: string,
    error: string,
    xcodeProject: { name: string },
    logFilePath: string
  ): void;
}

declare module '@expo/cli/build/src/run/ios/XcodeBuild.types.js' {
  import type { BundlerProps } from '@expo/cli/build/src/run/resolveBundlerProps.js';
  import type { OSType } from '@expo/cli/build/src/start/platforms/ios/simctl.js';
  import type { ModPlatform } from '@expo/config-plugins';

  export type XcodeConfiguration = 'Debug' | 'Release';

  export type Options = {
    device?: string | boolean;
    port?: number;
    scheme?: string | boolean;
    configuration?: XcodeConfiguration;
    bundler?: boolean;
    install?: boolean;
    buildCache?: boolean;
    binary?: string;
    rebundle?: boolean;
  };

  export type ProjectInfo = {
    isWorkspace: boolean;
    name: string;
  };

  export type BuildProps = {
    platform: ModPlatform;
    projectRoot: string;
    isSimulator: boolean;
    xcodeProject: ProjectInfo;
    device: { name: string; udid: string; osType: OSType };
    configuration: XcodeConfiguration;
    shouldSkipInitialBundling: boolean;
    buildCache: boolean;
    scheme: string;
    eagerBundleOptions?: string;
  } & BundlerProps;
}
