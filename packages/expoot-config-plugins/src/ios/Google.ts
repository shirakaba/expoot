import assert from 'assert';
import fs from 'fs';
import path from 'path';

import type { InfoPlist } from '@expo/config-plugins/build/ios/IosConfig.types';
import { appendScheme } from '@expo/config-plugins/build/ios/Scheme';
import {
  withInfoPlist,
  withXcodeProject,
} from '@expo/config-plugins/build/plugins/ios-plugins';
import plist from '@expo/plist';
import type { ExpoConfig } from '@expoot/config-types';
import type { XcodeProject } from 'xcode';

import type { ConfigPlugin, ModPlatform, ModProps } from '../Plugin.types';

import { getSourceRoot } from './Paths';
import { addResourceFileToGroup, getProjectName } from './utils/Xcodeproj';

export const withGoogle: ConfigPlugin = (config) => {
  return withInfoPlist(config, (config) => {
    config.modResults = setGoogleConfig(
      config,
      config.modResults,
      config.modRequest
    );
    return config;
  });
};

export const withGoogleServicesFile: ConfigPlugin = (config) => {
  return withXcodeProject(config, (config) => {
    config.modResults = setGoogleServicesFile(config, {
      projectRoot: config.modRequest.projectRoot,
      platform: config.modRequest.platform,
      project: config.modResults,
    });
    return config;
  });
};

function readGoogleServicesInfoPlist(
  relativePath: string,
  { projectRoot }: { projectRoot: string }
) {
  const googleServiceFilePath = path.resolve(projectRoot, relativePath);
  const contents = fs.readFileSync(googleServiceFilePath, 'utf8');
  assert(contents, 'GoogleService-Info.plist is empty');
  return plist.parse(contents);
}

export function getGoogleSignInReversedClientId(
  config: Pick<ExpoConfig, 'ios'>,
  modRequest: Pick<ModProps<InfoPlist>, 'projectRoot'>
): string | null {
  const googleServicesFileRelativePath = getGoogleServicesFile(config);
  if (googleServicesFileRelativePath === null) {
    return null;
  }

  const infoPlist = readGoogleServicesInfoPlist(
    googleServicesFileRelativePath,
    modRequest
  );

  return infoPlist.REVERSED_CLIENT_ID ?? null;
}

export function getGoogleServicesFile(config: Pick<ExpoConfig, 'ios'>) {
  return config.ios?.googleServicesFile ?? null;
}

export function setGoogleSignInReversedClientId(
  config: Pick<ExpoConfig, 'ios'>,
  infoPlist: InfoPlist,
  modRequest: Pick<ModProps<InfoPlist>, 'projectRoot'>
): InfoPlist {
  const reversedClientId = getGoogleSignInReversedClientId(config, modRequest);

  if (reversedClientId === null) {
    return infoPlist;
  }

  return appendScheme(reversedClientId, infoPlist);
}

export function setGoogleConfig(
  config: Pick<ExpoConfig, 'ios'>,
  infoPlist: InfoPlist,
  modRequest: ModProps<InfoPlist>
): InfoPlist {
  infoPlist = setGoogleSignInReversedClientId(config, infoPlist, modRequest);
  return infoPlist;
}

export function setGoogleServicesFile(
  config: Pick<ExpoConfig, 'ios'>,
  {
    projectRoot,
    project,
    platform,
  }: { project: XcodeProject; projectRoot: string; platform: ModPlatform }
): XcodeProject {
  const googleServicesFileRelativePath = getGoogleServicesFile(config);
  if (googleServicesFileRelativePath === null) {
    return project;
  }

  const googleServiceFilePath = path.resolve(
    projectRoot,
    googleServicesFileRelativePath
  );
  fs.copyFileSync(
    googleServiceFilePath,
    path.join(getSourceRoot(projectRoot, platform), 'GoogleService-Info.plist')
  );

  const projectName = getProjectName(projectRoot, platform);
  const plistFilePath = `${projectName}/GoogleService-Info.plist`;
  if (!project.hasFile(plistFilePath)) {
    project = addResourceFileToGroup({
      filepath: plistFilePath,
      groupName: projectName,
      project,
      isBuildFile: true,
      verbose: true,
    });
  }
  return project;
}
