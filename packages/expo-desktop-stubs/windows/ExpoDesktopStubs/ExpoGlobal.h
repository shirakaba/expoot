#pragma once

#include "pch.h"
#include "resource.h"

#if __has_include("codegen/ExpoGlobalDataTypes.g.h")
#include "codegen/NativeExpoGlobalDataTypes.g.h"
#endif
#include "codegen/NativeExpoGlobalSpec.g.h"

#include "JSValue.h"
#include "NativeModules.h"

#include <string>

namespace jsi = facebook::jsi;

namespace winrt::ExpoDesktopStubs {

REACT_TURBO_MODULE(ExpoGlobal);
struct ExpoGlobal {
  using ModuleSpec = ExpoDesktopStubsCodegen::ExpoGlobalSpec;

 public:
  // https://github.com/microsoft/react-native-windows/blob/2c3604ceaf073de3aec7e3e56c2286ea1b15287d/vnext/Shared/Modules/BlobModule.cpp#L31
  REACT_INIT(Initialize)
  void Initialize(winrt::Microsoft::ReactNative::ReactContext const &reactContext, facebook::jsi::Runtime &runtime) noexcept {

    // Install an empty `expo` object so that Expo JS runs enough to allow Expo
    // modules to load using TurboModules
    auto mainObject = std::make_shared<facebook::jsi::Object>(runtime);
    auto global = runtime.global();

    // https://github.com/expo/expo/blob/a8cdc17a5d03cc62385c63696e317fe5b9851a87/packages/expo-modules-core/android/src/main/cpp/installers/MainRuntimeInstaller.cpp#L137-L162
    // https://github.com/expo/expo/blob/1c87783c9b8f9a33a6349436cc0a62228541dbe6/packages/expo-modules-core/android/src/main/cpp/JavaScriptObject.cpp#L173
    jsi::Object descriptor = JavaScriptObject::preparePropertyDescriptor(runtime, 1 << 1);
    descriptor.setProperty(runtime, "value", jsi::Value(runtime, *mainObject));

    // https://github.com/expo/expo/blob/1a4c17d95f6d104cfd1a2d0ff8ea062c01e904c9/packages/expo-modules-core/common/cpp/JSI/JSIUtils.cpp#L134
    expo::common::defineProperty(
      runtime,
      &global,
      "expo",
      std::move(descriptor)
    );
  }
};

} // namespace ExpoDesktopStubs
