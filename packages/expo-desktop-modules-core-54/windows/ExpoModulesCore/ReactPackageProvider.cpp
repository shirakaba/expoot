#include "ReactPackageProvider.h"
#include "pch.h"
#if __has_include("ReactPackageProvider.g.cpp")
#include "ReactPackageProvider.g.cpp"
#endif

#include "ExpoModulesCore.h"

using namespace winrt::Microsoft::ReactNative;

namespace winrt::ExpoModulesCore::implementation {

void ReactPackageProvider::CreatePackage(
    IReactPackageBuilder const& packageBuilder) noexcept {
   AddAttributedModules(packageBuilder, true);
}

}  // namespace winrt::ExpoModulesCore::implementation
