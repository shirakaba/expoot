// Until we can configure TurboModules for eager initialisation (which is
// waiting on https://github.com/microsoft/react-native-windows/pull/16093), we
// need to trigger the lazy-init of our TurboModule by accessing it for the
// first time, which causes the TurboModuleManager to call its REACT_INIT
// method.
//
// We can't do any imports inside getPolyfills(), but can use the global proxy:
globalThis.nativeModuleProxy.ExpoMainRuntimeInstaller;
