// Mirrors the minimal parts of withMacosBaseMods needed for mods like
// `mods.windows.dangerous` (used by withDangerousMod-based plugins).

const fsPromises = require("node:fs/promises");
const {
  BaseMods: { withGeneratedBaseMods, provider },
} = require("@expo/config-plugins");
const XMLBuilder = require("fast-xml-builder");
const { XMLParser } = require("fast-xml-parser");
const Paths = require("./Paths");

/**
 * @type {Partial<Record<string, import("@expo/config-plugins/build/plugins/createBaseMod").BaseModProviderMethods<any, any>>>}
 */
const defaultProviders = {
  dangerous: provider({
    getFilePath() {
      return "";
    },
    async read() {
      return {};
    },
    async write() {},
  }),
  finalized: provider({
    getFilePath() {
      return "";
    },
    async read() {
      return {};
    },
    async write() {},
  }),
  appCpp: provider({
    getFilePath({ modRequest: { projectRoot } }) {
      // TODO: work out how to thread filesafeName through modRequest, probably
      //       via evalModsAsync(). For now, we just infer it based on the name
      //       of the .vcxproj file.
      return Paths.getAppCppFilePath(projectRoot, undefined);
    },
    async read(filePath) {
      return Paths.getFileInfo(filePath);
    },
    async write(filePath, { modResults: { contents } }) {
      await fsPromises.writeFile(filePath, contents);
    },
  }),
  vcxproj: provider({
    isIntrospective: true,
    getFilePath({ modRequest: { projectRoot } }) {
      return Paths.getVcxprojFilePath(projectRoot, undefined);
    },
    async read(filePath) {
      const data = await fsPromises.readFile(filePath, "utf-8");
      return new XMLParser({ preserveOrder: true }).parse(data);
    },
    async write(filePath, { modRequest: { introspect }, modResults }) {
      const builder = new XMLBuilder({});
      const output = builder.build(modResults);

      // Return early without writing, in introspection mode.
      if (introspect) {
        return;
      }
      await fsPromises.writeFile(filePath, output);
    },
  }),
};

/**
 * @param {import("@expo/config-plugins").ExportedConfig} config
 * @param {import("@expo/config-plugins/build/plugins/createBaseMod").ForwardedBaseModOptions & { providers?: Partial<typeof defaultProviders> }} [props={}]
 * @returns {import("@expo/config-plugins").ExportedConfig}
 */
function withWindowsBaseMods(config, { providers, ...props } = {}) {
  return withGeneratedBaseMods(config, {
    ...props,
    platform: "windows",
    providers: providers ?? getWindowsModFileProviders(),
  });
}

function getWindowsModFileProviders() {
  return defaultProviders;
}

exports.withWindowsBaseMods = withWindowsBaseMods;
exports.getWindowsModFileProviders = getWindowsModFileProviders;
