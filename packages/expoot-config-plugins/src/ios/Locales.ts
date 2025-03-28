import fs from 'node:fs';
import { join, relative } from 'node:path';

import { withXcodeProject } from '@expo/config-plugins/build/plugins/ios-plugins';
import { addWarningIOS } from '@expo/config-plugins/build/utils/warnings';
import type { ExpoConfig as UpstreamExpoConfig } from '@expo/config-types';
import JsonFile from '@expo/json-file';
import type { ExpoConfig } from '@expoot/config-types';
import type { XcodeProject } from 'xcode';

import type { ConfigPlugin, ModPlatform } from '../Plugin.types';

import {
  addResourceFileToGroup,
  ensureGroupRecursively,
  getProjectName,
} from './utils/Xcodeproj';

type LocaleJson = Record<string, string>;
type ResolvedLocalesJson = Record<string, LocaleJson>;
type ExpoConfigLocales = NonNullable<ExpoConfig['locales']>;

export const withLocales: ConfigPlugin = (config) => {
  return withXcodeProject(config as UpstreamExpoConfig, async (config) => {
    config.modResults = await setLocalesAsync(config, {
      projectRoot: config.modRequest.projectRoot,
      platform: config.modRequest.platform,
      project: config.modResults,
    });
    return config;
  });
};

export function getLocales(
  config: Pick<ExpoConfig, 'locales'>
): Record<string, string | LocaleJson> | null {
  return config.locales ?? null;
}

export async function setLocalesAsync(
  config: Pick<ExpoConfig, 'locales'>,
  {
    projectRoot,
    platform,
    project,
  }: { projectRoot: string; platform: ModPlatform; project: XcodeProject }
): Promise<XcodeProject> {
  const locales = getLocales(config);
  if (!locales) {
    return project;
  }
  // possibly validate CFBundleAllowMixedLocalizations is enabled
  const localesMap = await getResolvedLocalesAsync(projectRoot, locales);

  const projectName = getProjectName(projectRoot, platform);
  const supportingDirectory = join(
    projectRoot,
    platform,
    projectName,
    'Supporting'
  );

  // TODO: Should we delete all before running? Revisit after we land on a lock file.
  const stringName = 'InfoPlist.strings';

  for (const [lang, localizationObj] of Object.entries(localesMap)) {
    const dir = join(supportingDirectory, `${lang}.lproj`);
    // await fs.ensureDir(dir);
    await fs.promises.mkdir(dir, { recursive: true });

    const strings = join(dir, stringName);
    const buffer = [];
    for (const [plistKey, localVersion] of Object.entries(localizationObj)) {
      buffer.push(`${plistKey} = "${localVersion}";`);
    }
    // Write the file to the file system.
    await fs.promises.writeFile(strings, buffer.join('\n'));

    const groupName = `${projectName}/Supporting/${lang}.lproj`;
    // deep find the correct folder
    const group = ensureGroupRecursively(project, groupName);

    // Ensure the file doesn't already exist
    if (!group?.children.some(({ comment }) => comment === stringName)) {
      // Only write the file if it doesn't already exist.
      project = addResourceFileToGroup({
        filepath: relative(supportingDirectory, strings),
        groupName,
        project,
        isBuildFile: true,
        verbose: true,
      });
    }
  }

  return project;
}

export async function getResolvedLocalesAsync(
  projectRoot: string,
  input: ExpoConfigLocales
): Promise<ResolvedLocalesJson> {
  const locales: ResolvedLocalesJson = {};
  for (const [lang, localeJsonPath] of Object.entries(input)) {
    if (typeof localeJsonPath === 'string') {
      try {
        locales[lang] = await JsonFile.readAsync(
          join(projectRoot, localeJsonPath)
        );
      } catch {
        // Add a warning when a json file cannot be parsed.
        addWarningIOS(
          `locales.${lang}`,
          `Failed to parse JSON of locale file for language: ${lang}`,
          'https://docs.expo.dev/distribution/app-stores/#localizing-your-ios-app'
        );
      }
    } else {
      // In the off chance that someone defined the locales json in the config, pass it directly to the object.
      // We do this to make the types more elegant.
      locales[lang] = localeJsonPath;
    }
  }

  return locales;
}
