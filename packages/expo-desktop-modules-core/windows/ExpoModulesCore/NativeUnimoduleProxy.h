#pragma once

#include "pch.h"
#include "resource.h"

#if __has_include("codegen/NativeUnimoduleProxyDataTypes.g.h")
#include "codegen/NativeNativeUnimoduleProxyDataTypes.g.h"
#endif
#include "codegen/NativeNativeUnimoduleProxySpec.g.h"

#include "JSValue.h"
#include "NativeModules.h"


namespace winrt::ExpoDesktopModulesCore {

REACT_TURBO_MODULE(NativeUnimoduleProxy);
struct NativeUnimoduleProxy {
  using ModuleSpec = ExpoDesktopModulesCoreCodegen::NativeUnimoduleProxySpec;
};

} // namespace winrt::ExpoDesktopModulesCore
