const { getDefaultConfig } = require("@expo/metro-config");
const { makeMetroConfig } = require("@rnx-kit/metro-config");

const config = makeMetroConfig(getDefaultConfig(__dirname));

const getPolyfills = config.serializer.getPolyfills;
const windowsExpoPolyfill = require.resolve("./expo-polyfill.windows.js");
config.serializer.getPolyfills = (platform) => {
  const polyfills = getPolyfills(platform);
  if (platform === "windows") {
    polyfills.push(windowsExpoPolyfill);
  }
  return polyfills;
};

module.exports = config;
