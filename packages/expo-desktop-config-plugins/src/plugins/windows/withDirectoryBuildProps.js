const fsPromises = require("node:fs/promises");
const path = require("node:path");
const { withDangerousMod } = require("@expo/config-plugins");
const { addWarningWindows } = require("../macos/_utils/warnings");

/**
 * Writes a `Directory.Build.props` at the project root (one level above
 * `windows/`) so every native project under the tree — including
 * `node_modules/<lib>/windows/<sub>/<sub>.vcxproj` — inherits the same
 * `ReactNativeDir` and `ReactNativeWindowsDir` values without each library's
 * own fallback ever firing.
 *
 * Paths are resolved with Node module resolution from the project root and
 * written relative to `$(MSBuildThisFileDirectory)` so the generated file is
 * portable across machines.
 *
 * @type {import("@expo/config-plugins").ConfigPlugin<Record<string, never> | void>}
 */
function withDirectoryBuildProps(config, _props) {
  return withDangerousMod(config, [
    "windows",
    async (config) => {
      const { projectRoot } = config.modRequest;

      const reactNativeRel = resolvePackageRelativePath(
        projectRoot,
        "react-native",
        path.win32.join("node_modules", "react-native"),
      );
      const reactNativeWindowsRel = resolvePackageRelativePath(
        projectRoot,
        "react-native-windows",
        path.win32.join("node_modules", "react-native-windows"),
      );

      const xml = buildDirectoryBuildProps({
        reactNativeRel,
        reactNativeWindowsRel,
      });
      const target = path.join(projectRoot, "Directory.Build.props");
      await fsPromises.writeFile(target, xml, "utf8");

      return config;
    },
  ]);
}
module.exports.withDirectoryBuildProps = withDirectoryBuildProps;

/**
 * Resolves `<packageName>/package.json` from `projectRoot` using Node's
 * resolution algorithm, then returns the package directory expressed as a
 * Windows-style path relative to `projectRoot`.
 *
 * If the package cannot be resolved because it isn't installed yet (e.g.
 * `expo prebuild --no-install`), warns the user and falls back to
 * `fallbackRelWin`.
 *
 * @param {string} projectRoot
 * @param {string} packageName
 * @param {string} fallbackRelWin Windows-style relative path used when
 *   resolution fails because the package isn't installed.
 * @returns {string}
 */
function resolvePackageRelativePath(projectRoot, packageName, fallbackRelWin) {
  let resolvedAbs;
  try {
    resolvedAbs = path.dirname(
      require.resolve(`${packageName}/package.json`, { paths: [projectRoot] }),
    );
  } catch (error) {
    if (!(error instanceof Error) || !("code" in error) || error.code !== "MODULE_NOT_FOUND") {
      throw error;
    }

    addWarningWindows(
      "Directory.Build.props",
      `Could not resolve "${packageName}" from "${projectRoot}". ` +
        `Falling back to "${fallbackRelWin}" — install node_modules ` +
        `(or rerun prebuild without --no-install) so the resolved path can be written instead.`,
    );
    return fallbackRelWin;
  }

  return path.win32.relative(projectRoot, resolvedAbs);
}

/**
 * @param {{ reactNativeRel: string; reactNativeWindowsRel: string }} props
 */
function buildDirectoryBuildProps({ reactNativeRel, reactNativeWindowsRel }) {
  const reactNative = escapeXml(ensureTrailingBackslash(reactNativeRel));
  const reactNativeWindows = escapeXml(ensureTrailingBackslash(reactNativeWindowsRel));

  return (
    `<?xml version="1.0" encoding="utf-8"?>\n` +
    `<!-- Managed by expo-desktop prebuild. Do not edit by hand. -->\n` +
    `<Project xmlns="http://schemas.microsoft.com/developer/msbuild/2003">\n` +
    `  <PropertyGroup Label="ExpoDesktopReactNativePaths">\n` +
    `    <ReactNativeDir Condition="'$(ReactNativeDir)' == ''">$(MSBuildThisFileDirectory)${reactNative}</ReactNativeDir>\n` +
    `    <ReactNativeWindowsDir Condition="'$(ReactNativeWindowsDir)' == ''">$(MSBuildThisFileDirectory)${reactNativeWindows}</ReactNativeWindowsDir>\n` +
    `  </PropertyGroup>\n` +
    `</Project>\n`
  );
}

/** @param {string} value */
function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

/** @param {string} value */
function ensureTrailingBackslash(value) {
  return value.endsWith("\\") ? value : `${value}\\`;
}
