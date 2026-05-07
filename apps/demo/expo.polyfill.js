console.log("Running now-empty expo.polyfill.js.");

// // Trigger the Initialize() method on the TurboModule.
// // One day they'll support eagerInit so we can avoid this JS-land workaround.
// // TurboModuleRegistry.get < any > "DataMarshallingExamples";
// //
// // We can't do imports in getPolyfills(), but this exists:
// globalThis.__turboModuleProxy("DataMarshallingExamples");

// // globalThis.expo = {};

// console.log("Ran expo.polyfill.js! After: ", globalThis.expo);
