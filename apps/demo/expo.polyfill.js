// Until we can configure TurboModules for eager initialisation (which is
// waiting on https://github.com/microsoft/react-native-windows/pull/16093), we
// need to trigger the lazy-init of our TurboModule by accessing it for the
// first time, which causes the TurboModuleManager to call its REACT_INIT
// method.
//
// We can't do any imports inside getPolyfills(), but can use the global proxy:
globalThis.nativeModuleProxy.ExpoMainRuntimeInstaller;

// Temporary stubs to suppress these warnings:
//  WARN  The "EXNativeModulesProxy" native module is not exported through NativeModules; verify that expo-modules-core's native code is linked properly
//  WARN  No native ExponentConstants module found, are you sure the expo-constants's module is linked properly?
//  WARN  No native ExponentConstants module found, are you sure the expo-constants's module is linked properly?

const { ExpoAsset, NativeUnimoduleProxy } = globalThis.nativeModuleProxy;

const ExponentConstants = {};

// Use Object.defineProperties to work around:
// > TypeError: Cannot assign to property 'ExpoAsset' on HostObject with default setter
Object.defineProperties(NativeUnimoduleProxy, {
  ExpoAsset: {
    configurable: false,
    enumerable: true,
    value: ExpoAsset,
    writable: false,
  },
  ExponentConstants: {
    configurable: false,
    enumerable: true,
    value: ExponentConstants,
    writable: false,
  },
});

globalThis.expo.modules = {
  ExpoAsset,
  ExponentConstants,
};
