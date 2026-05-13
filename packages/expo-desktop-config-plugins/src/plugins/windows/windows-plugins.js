const { withMod } = require("@expo/config-plugins");

/**
 * @template T
 * @param {import("@expo/config-plugins").ExportedConfig} config
 * @param {import("@expo/config-plugins").Mod<T>} action
 */
const withAppCpp = (config, action) => {
  return withMod(config, {
    platform: "macos",
    mod: "appCpp",
    action,
  });
};
exports.withAppCpp = withAppCpp;
