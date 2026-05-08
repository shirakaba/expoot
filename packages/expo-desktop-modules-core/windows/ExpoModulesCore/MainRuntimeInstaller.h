#pragma once

#include "pch.h"
#include "resource.h"

#if __has_include("codegen/ExpoMainRuntimeInstallerDataTypes.g.h")
#include "codegen/NativeExpoMainRuntimeInstallerDataTypes.g.h"
#endif
#include "codegen/NativeExpoMainRuntimeInstallerSpec.g.h"

#include "JSValue.h"
#include "NativeModules.h"

#include "JavaScriptObject.h"
#include "JSIUtils.h"
#include "EventEmitter.h"
#include "SharedRef.h"
#include "NativeModule.h"

#include <string>

namespace jsi = facebook::jsi;

namespace winrt::ExpoDesktopModulesCore {

REACT_TURBO_MODULE(ExpoMainRuntimeInstaller);
struct ExpoMainRuntimeInstaller {
  using ModuleSpec = ExpoDesktopModulesCoreCodegen::ExpoMainRuntimeInstallerSpec;

 public:
  // https://github.com/microsoft/react-native-windows/blob/2c3604ceaf073de3aec7e3e56c2286ea1b15287d/vnext/Shared/Modules/BlobModule.cpp#L31
  REACT_INIT(Initialize)
  // https://github.com/expo/expo/blob/95684e9c673859cd1a6ba1243d4ee00e0f09591d/packages/expo-modules-core/android/src/main/cpp/installers/MainRuntimeInstaller.cpp#L123
  void Initialize(winrt::Microsoft::ReactNative::ReactContext const &reactContext, facebook::jsi::Runtime &runtime) noexcept {
    auto mainObject = std::make_shared<facebook::jsi::Object>(runtime);
    auto global = runtime.global();

    jsi::Object descriptor = expo::JavaScriptObject::preparePropertyDescriptor(runtime, 1 << 1);
    descriptor.setProperty(runtime, "value", jsi::Value(runtime, *mainObject));

    expo::common::defineProperty(
      runtime,
      &global,
      "expo",
      std::move(descriptor)
    );

    installClasses(runtime);
  }

  private:
    // // https://github.com/expo/expo/blob/95684e9c673859cd1a6ba1243d4ee00e0f09591d/packages/expo-modules-core/android/src/main/cpp/installers/MainRuntimeInstaller.cpp#L50
    // jni::local_ref<JSIContext::javaobject> MainRuntimeInstaller::install(
    //   jni::alias_ref<MainRuntimeInstaller::javaobject> self,
    //   jni::alias_ref<jni::JWeakReference<jobject>::javaobject> runtimeContextHolder,
    //   jlong jsRuntimePointer,
    //   jni::alias_ref<JNIDeallocator::javaobject> jniDeallocator,
    //   jni::alias_ref<react::JRuntimeExecutor::javaobject> runtimeExecutor
    // ) noexcept {
    //   auto *runtime = reinterpret_cast<jsi::Runtime *>(jsRuntimePointer);
    //
    //   std::shared_ptr<react::CallInvoker> callInvoker;
    //   std::shared_ptr<react::RuntimeScheduler> runtimeScheduler;
    //
    //   if (auto binding = react::RuntimeSchedulerBinding::getBinding(*runtime)) {
    //     runtimeScheduler = binding->getRuntimeScheduler();
    //     callInvoker = std::make_shared<react::RuntimeSchedulerCallInvoker>(runtimeScheduler);
    //   } else {
    //     callInvoker = std::make_shared<BridgelessJSCallInvoker>(runtimeExecutor->cthis()->get());
    //   }
    //
    //   auto jsiContext = createJSIContext(
    //     runtimeContextHolder,
    //     jsRuntimePointer,
    //     jniDeallocator,
    //     callInvoker
    //   );
    //
    //   prepareRuntime(
    //     self,
    //     jsiContext
    //   );
    //
    //   return jsiContext;
    // }

    // // https://github.com/expo/expo/blob/95684e9c673859cd1a6ba1243d4ee00e0f09591d/packages/expo-modules-core/android/src/main/cpp/installers/MainRuntimeInstaller.cpp#L96
    // void MainRuntimeInstaller::prepareRuntime(
    //   jni::alias_ref<MainRuntimeInstaller::javaobject> self,
    //   jni::local_ref<JSIContext::javaobject> jsiContext
    // ) noexcept {
    //   auto cxxPart = jsiContext->cthis();
    //   auto runtimeHolder = cxxPart->runtimeHolder;
    //   jsi::Runtime &runtime = runtimeHolder->get();
    //
    //   bindJSIContext(runtime, cxxPart);
    //
    //   std::shared_ptr<jsi::Object> mainObject = installMainObject(
    //     runtime, MainRuntimeInstaller::getCoreModule(self)->cthis()->decorators
    //   );
    //
    //   installClasses(
    //     runtime,
    //     cxxPart
    //   );
    //
    //   installModules(
    //     runtime,
    //     cxxPart,
    //     mainObject
    //   );
    // }

    // https://github.com/expo/expo/blob/95684e9c673859cd1a6ba1243d4ee00e0f09591d/packages/expo-modules-core/android/src/main/cpp/installers/MainRuntimeInstaller.cpp#L150
    void installClasses(jsi::Runtime &runtime) noexcept {
      // We can't predict the order of deallocation of the JSIContext and the SharedObject.
      // So we need to pass a new ref to retain the JSIContext to make sure it's not deallocated before the SharedObject.
      // const auto releaser = [threadSafeRef = jsiContext->threadSafeJThis](
      //   const SharedObject::ObjectId objectId) {
      //   threadSafeRef->use([objectId](jni::alias_ref<JSIContext::javaobject> globalRef) {
      //     JSIContext::deleteSharedObject(globalRef, objectId);
      //   });
      // };

      const auto releaser = [](const expo::SharedObject::ObjectId objectId) {
        // No-op, as we haven't implemented JSIContext
      };

      expo::EventEmitter::installClass(runtime);
      expo::SharedObject::installBaseClass(runtime, releaser);
      expo::SharedRef::installBaseClass(runtime);
      expo::NativeModule::installClass(runtime);
    }
};

} // namespace ExpoDesktopModulesCore
