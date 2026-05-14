const { withVcxproj } = require("./windows-plugins");
const { addWarningWindows } = require("../macos/_utils/warnings");

/**
 * @param {import("@expo/config-types").ExpoConfig} config
 * @param {{ windowTitle?: string }} props
 * @returns {import("@expo/config-plugins").ExportedConfig}
 */
function withReactNativeDirs(config, props = {}) {
  return withVcxproj(config, (config) => {
    try {
      config.modResults.contents = updateReactNativeWindowsProps(config.modResults.contents);
    } catch (error) {
      if (error?.code === "ERR_NO_MATCH") {
        addWarningWindows(
          "windows",
          `[with-expo-app-cpp] Cannot update ReactNativeWindowsProps because the App.vxcproj did not contain the expected <PropertyGroup Label="ReactNativeWindowsProps"> element.`,
        );
      } else {
        throw error;
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
function escapeXmlString(value) {
  // TODO
  return value;
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
 * @returns {string}
 */
function updateReactNativeWindowsProps(contents) {
  let pattern = /<PropertyGroup\s+Label="ReactNativeWindowsProps">[\s\S]*?<\/PropertyGroup>/m;
  const propertyGroupMatch = pattern.exec(contents);
  if (!propertyGroupMatch) {
    const error = new Error(`Failed to match "${pattern}" in contents:\n${contents}`);
    error.code = "ERR_NO_MATCH";
    throw error;
  }
  const [reactNativeWindowsProps] = propertyGroupMatch;

  pattern = /<ReactNativeWindowsDir>[\s\S]*?<\/ReactNativeWindowsDir>/m;
  const reactNativeWindowsDirMatch = pattern.exec(reactNativeWindowsProps);
  if (!reactNativeWindowsDirMatch) {
    const error = new Error(`Failed to match "${pattern}" in contents:\n${contents}`);
    error.code = "ERR_NO_MATCH";
    throw error;
  }
  const [reactNativeWindowsDir] = reactNativeWindowsDirMatch;

  pattern = /<ReactNativeDir>[\s\S]*?<\/ReactNativeDir>/m;
  const reactNativeMatch = pattern.exec(reactNativeWindowsProps);
  if (!reactNativeMatch) {
    const error = new Error(`Failed to match "${pattern}" in contents:\n${contents}`);
    error.code = "ERR_NO_MATCH";
    throw error;
  }
  const [reactNative] = reactNativeMatch;

  // TODO
}
