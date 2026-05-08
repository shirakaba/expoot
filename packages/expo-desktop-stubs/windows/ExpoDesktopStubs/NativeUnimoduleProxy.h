#pragma once

#include "pch.h"
#include "resource.h"

#if __has_include("codegen/NativeUnimoduleProxyDataTypes.g.h")
#include "codegen/NativeNativeUnimoduleProxyDataTypes.g.h"
#endif
#include "codegen/NativeNativeUnimoduleProxySpec.g.h"

#include "JSValue.h"
#include "NativeModules.h"


namespace winrt::ExpoDesktopStubs {

REACT_TURBO_MODULE(NativeUnimoduleProxy);
struct NativeUnimoduleProxy {
  using ModuleSpec = ExpoDesktopStubsCodegen::NativeUnimoduleProxySpec;
};

} // namespace winrt::ExpoDesktopStubs
