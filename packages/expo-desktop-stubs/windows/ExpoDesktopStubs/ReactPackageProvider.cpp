#include "pch.h"

#include "ReactPackageProvider.h"
#if __has_include("ReactPackageProvider.g.cpp")
#include "ReactPackageProvider.g.cpp"
#endif

#include "ExpoAsset.h"
#include "ExpoGlobal.h"

using namespace winrt::Microsoft::ReactNative;

namespace winrt::ExpoDesktopStubs::implementation
{

void ReactPackageProvider::CreatePackage(IReactPackageBuilder const &packageBuilder) noexcept
{
  AddAttributedModules(packageBuilder, true);
}

} // namespace winrt::ExpoDesktopStubs::implementation
