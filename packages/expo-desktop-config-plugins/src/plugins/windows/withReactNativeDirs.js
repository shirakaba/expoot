const { withVcxproj } = require("./windows-plugins");
const { addWarningWindows } = require("../macos/_utils/warnings");

/**
 * @param {import("@expo/config-types").ExpoConfig} config
 * @param {Record<string, never>} props
 * @returns {import("@expo/config-plugins").ExportedConfig}
 */
function withReactNativeDirs(config, props = {}) {
  return withVcxproj(config, (config) => {
    config = updateReactNativeWindowsProps(config);

    return config;
  });
}
module.exports.withReactNativeDirs = withReactNativeDirs;

/**
 * @param {import("@expo/config-plugins").ExportedConfigWithProps<ReturnType<import("fast-xml-parser").XMLParser["parse"]>>} config
 */
function updateReactNativeWindowsProps(config) {
  console.log("updateReactNativeWindowsProps()", config.modResults);

  return config;
}
