try {
  // FIXME: restrict this to Windows. Maybe best to do that at the Metro level.

  // Until we can configure TurboModules for eager initialisation (which is
  // waiting on https://github.com/microsoft/react-native-windows/pull/16093), we
  // need to trigger the lazy-init of our TurboModule by accessing it for the
  // first time, which causes the TurboModuleManager to call its REACT_INIT
  // method.
  //
  // We can't do any imports inside getPolyfills(), but can use the global proxy:
  globalThis.nativeModuleProxy.ExpoMainRuntimeInstaller;

  // TODO: Implement Expo's NativeModulesProxy and make all of this
  //       lazy-initialised (and actually populate `exportedMethods`, etc.).

  // Below are temporary stubs to suppress these warnings:
  //  WARN  The "EXNativeModulesProxy" native module is not exported through NativeModules; verify that expo-modules-core's native code is linked properly
  //  WARN  No native ExponentConstants module found, are you sure the expo-constants's module is linked properly?
  //  WARN  No native ExponentConstants module found, are you sure the expo-constants's module is linked properly?

  // Funnily enough, although expo-modules-core prefers to access
  // global.expo?.modules?.NativeModulesProxy over the deprecated
  // NativeModules?.NativeUnimoduleProxy, we still need the latter to exist in
  // order for it to check the former. And it's only
  globalThis.nativeModuleProxy.NativeUnimoduleProxy;
  const { ExpoAsset } = globalThis.nativeModuleProxy;

  const ExponentConstants = {};

  globalThis.expo.modules = {
    ExpoAsset,
    ExponentConstants,
    // - JS: apps/demo/node_modules/expo-modules-core/src/NativeModulesProxy.native.ts
    // - iOS:
    //   - NativeUnimoduleProxy: apps/demo/node_modules/expo-modules-core/ios/Legacy/NativeModulesProxy/NativeModulesProxyModule.swift
    //   - NativeModulesProxy: apps/demo/node_modules/expo-modules-core/ios/Legacy/NativeModulesProxy/EXNativeModulesProxy.mm
    // - Android:
    //   - NativeUnimoduleProxy: apps/demo/node_modules/expo-modules-core/android/src/main/java/expo/modules/adapters/react/NativeModulesProxy.java
    //   - NativeModulesProxy: apps/demo/node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/defaultmodules/NativeModulesProxyModule.kt
    NativeModulesProxy: {
      exportedMethods: {
        ExpoAsset: [],
        ExponentConstants: [],
      },
      modulesConstants: {
        ExpoAsset: [],
        ExponentConstants: [],
      },
    },
  };

  // Now expo-modules-core can populate its fileprivate
  // `const NativeModulesProxy: Record<string, ProxyNativeModule = {}` from our
  // global.expo?.modules?.NativeModulesProxy. This avoids the warning about
  // EXNativeModulesProxy being missing.
} catch (error) {
  console.error("Polyfill failed", error);
  throw error;
}
