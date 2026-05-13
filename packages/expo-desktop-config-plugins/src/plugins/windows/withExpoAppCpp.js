const { withAppCpp } = require("./windows-plugins");
const { addWarningWindows } = require("../macos/_utils/warnings");

/**
 * @param {import("@expo/config-types").ExpoConfig} config
 * @param {{ windowTitle?: string }} props
 * @returns {import("@expo/config-plugins").ExportedConfig}
 */
function withExpoAppCpp(config, props = {}) {
  return withAppCpp(config, (config) => {
    try {
      config.modResults.contents = rewriteComponentName(config.modResults.contents, {
        componentName: "main",
      });
    } catch (error) {
      if (error?.code === "ERR_NO_MATCH") {
        addWarningWindows(
          "windows",
          `[with-expo-app-cpp] Cannot set React component name because the App.cpp did not contain the expected "viewOptions.ComponentName(...)" call.`,
        );
      } else {
        throw error;
      }
    }

    try {
      config.modResults.contents = rewriteJavaScriptBundleFile(config.modResults.contents, {
        bundleFileName: ".expo/.virtual-metro-entry",
      });
    } catch (error) {
      if (error?.code === "ERR_NO_MATCH") {
        addWarningWindows(
          "windows",
          `[with-expo-app-cpp] Cannot set JavaScript bundle root because the App.cpp did not contain the expected "settings.JavaScriptBundleFile(...)" call.`,
        );
      } else {
        throw error;
      }
    }

    if (props.windowTitle) {
      try {
        config.modResults.contents = rewriteWindowTitle(config.modResults.contents, {
          windowTitle: props.windowTitle,
        });
      } catch (error) {
        if (error?.code === "ERR_NO_MATCH") {
          addWarningWindows(
            "windows",
            `[with-expo-app-cpp] Cannot set window title because the App.cpp did not contain the expected "appWindow.Title(...)" call.`,
          );
        } else {
          throw error;
        }
      }
    }

    return config;
  });
}
module.exports.withExpoAppCpp = withExpoAppCpp;

/**
 * @param {string} value
 * @returns {string}
 */
function escapeCppWideString(value) {
  // Minimal escaping for a wide string literal in C++: L"..."
  return String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

/**
 * @param {string} contents
 * @param {RegExp} regex
 * @param {string} replacement
 * @returns {string}
 */
function replaceOrThrow(contents, regex, replacement) {
  if (!regex.test(contents)) {
    const error = new Error(`Failed to match "${regex}" in contents:\n${contents}`);
    error.code = "ERR_NO_MATCH";
    throw error;
  }
  return contents.replace(regex, replacement);
}

/**
 * @param {string} contents
 * @param {object} props
 * @param {string} props.windowTitle
 * @returns {string}
 */
function rewriteWindowTitle(contents, { windowTitle }) {
  const escaped = escapeCppWideString(windowTitle);
  return replaceOrThrow(
    contents,
    /appWindow\.Title\(L"[^"]*"\);/,
    `appWindow.Title(L"${escaped}");`,
  );
}

/**
 * @param {string} contents
 * @param {object} props
 * @param {string} props.componentName
 * @returns {string}
 */
function rewriteComponentName(contents, { componentName }) {
  const escaped = escapeCppWideString(componentName);

  return replaceOrThrow(
    contents,
    /viewOptions\.ComponentName\(L"[^"]*"\);/,
    `viewOptions.ComponentName(L"${escaped}");`,
  );
}

/**
 * @param {string} contents
 * @param {object} props
 * @param {string} props.bundleFileName
 * @returns {string}
 */
function rewriteJavaScriptBundleFile(contents, { bundleFileName }) {
  const escaped = escapeCppWideString(bundleFileName);

  return replaceOrThrow(
    contents,
    /settings\.JavaScriptBundleFile\(L"[^"]*"\);/,
    `settings.JavaScriptBundleFile(L"${escaped}");`,
  );
}
