#pragma once

#include "pch.h"
#include "resource.h"

#if __has_include("codegen/ExpoAssetDataTypes.g.h")
#include "codegen/NativeExpoAssetDataTypes.g.h"
#endif
#include "codegen/NativeExpoAssetSpec.g.h"

#include "JSValue.h"
#include "NativeModules.h"

#include <functional>
#include <sstream>
#include <string>

namespace jsi = facebook::jsi;

namespace winrt::ExpoDesktopStubs {

REACT_TURBO_MODULE(ExpoAsset);
struct ExpoAsset {
  using ModuleSpec = ExpoDesktopStubsCodegen::ExpoAssetSpec;
  using Response = NativeModuleSampleCodegen::SimpleHttpModuleSpec_Response;

  // An example asynchronous method which uses asynchronous Windows APIs to make a
  // http request to the given url and resolve the given promise with the result
  // https://github.com/microsoft/react-native-windows-samples/blob/8e327b591e3f4895988d9b65018fda2519152892/samples/NativeModuleSample/cpp-lib/windows/NativeModuleSample/SimpleHttpModule.h#L28-L54
  static winrt::Windows::Foundation::IAsyncAction GetHttpResponseAsync(
      std::string uri,
      winrt::Microsoft::ReactNative::ReactPromise<Response> promise) noexcept {
    // (1) Capture the promise to make sure it doesn't get cleaned up during the
    //     asynchronous calls below.
    auto capturedPromise = promise;

    // (2) Create an HttpClient object.
    auto httpClient = winrt::Windows::Web::Http::HttpClient();

    // (3) Send the GET request asynchronously.
    auto httpResponseMessage = co_await httpClient.GetAsync(winrt::Windows::Foundation::Uri(winrt::to_hstring(uri)));

    // (4) Parse the response.
    auto statusCode = httpResponseMessage.StatusCode();
    auto content = co_await httpResponseMessage.Content().ReadAsStringAsync();

    // TODO: handle redirects?

    // (5) Handle bad responses.
    int statusCodeInt = static_cast<int>(statusCode);
    if (statusCodeInt != 200) {
      auto error = winrt::Microsoft::ReactNative::ReactError();
      error.Message = "Got non-200 response code: " + statusCodeInt + ".";
      promise.Reject(error);
      return;
    }

    // (5) Build a result object.
    // auto resultObject = Response();
    // resultObject.statusCode = static_cast<int>(statusCode);
    // resultObject.content = winrt::to_string(content);
    // capturedPromise.Resolve(std::move(resultObject));

    capturedPromise.Resolve(std::move(winrt::to_string(content)));
  }

 public:
  // An example method which provides a promise-based JS method on one side
  // which seamlessly calls native asynchronous code without any blocking
  //
  // Example JS:
  //
  // TurboModuleRegistry.get("ExpoAsset", md5Hash satisfies string|null, "png").downloadAsync('https://microsoft.github.io/react-native-windows/')
  //  .then(result => console.log(result))
  //  .catch(error => console.log(error));
  REACT_METHOD(downloadAsync);
  void downloadAsync(std::string uri, std::optional<std::string> md5Hash, std::string type, winrt::Microsoft::ReactNative::ReactPromise<Response> promise) noexcept {
    // Here we're simply starting our asynchronous method and returning back to
    // the caller
    auto asyncOp = GetHttpResponseAsync(uri, promise);
    asyncOp.Completed([promise](auto action, auto status) {
      // Here we handle any unhandled exceptions thrown during the
      // asynchronous call by rejecting the promise with the error code
      if (status == winrt::Windows::Foundation::AsyncStatus::Error) {
        std::stringstream errorCode;
        errorCode << "0x" << std::hex << action.ErrorCode() << std::endl;

        auto error = winrt::Microsoft::ReactNative::ReactError();
        error.Message = "HRESULT " + errorCode.str() + ": " + std::system_category().message(action.ErrorCode());
        promise.Reject(error);
      }
    });
  }
};

} // namespace ExpoDesktopStubs
