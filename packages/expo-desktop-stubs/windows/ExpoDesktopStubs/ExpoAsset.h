#pragma once

#include "pch.h"
#include "resource.h"

#if __has_include("codegen/ExpoAssetDataTypes.g.h")
#include "codegen/NativeExpoAssetDataTypes.g.h"
#endif
#include "codegen/NativeExpoAssetSpec.g.h"

#include "JSValue.h"
#include "NativeModules.h"

#include <winrt/Windows.Web.Http.Headers.h>
#include <winrt/Windows.Web.Http.h>
#include <winrt/Windows.Foundation.h>
#include <winrt/Windows.Storage.h>
#include <winrt/Windows.Storage.Streams.h>
#include <winrt/Windows.Security.Cryptography.h>
#include <winrt/Windows.Security.Cryptography.Core.h>

#include <algorithm>
#include <cctype>
#include <cstdint>
#include <filesystem>
#include <fstream>
#include <functional>
#include <optional>
#include <sstream>
#include <string>
#include <system_error>
#include <vector>

namespace winrt::ExpoDesktopStubs {

REACT_TURBO_MODULE(ExpoAsset);
struct ExpoAsset {
  using ModuleSpec = ExpoDesktopStubsCodegen::ExpoAssetSpec;

 private:
  // -------------------------------------------------------------------------
  // Errors (analogous to UnableToDownloadAssetException /
  // UnableToSaveAssetToDirectoryException on Android/iOS).
  // -------------------------------------------------------------------------

  static winrt::Microsoft::ReactNative::ReactError MakeError(std::string const &message) noexcept {
    auto error = winrt::Microsoft::ReactNative::ReactError();
    error.Message = message;
    return error;
  }

  static winrt::Microsoft::ReactNative::ReactError UnableToDownloadAssetError(std::string const &url, std::string const &detail = {}) noexcept {
    std::string message = std::string("Unable to download asset from url: '") + url + "'";
    if (!detail.empty()) {
      message += ": " + detail;
    }
    return MakeError(message);
  }

  static winrt::Microsoft::ReactNative::ReactError UnableToSaveAssetError(std::string const &localPath, std::string const &detail = {}) noexcept {
    std::string message = std::string("Unable to save asset to directory: '") + localPath + "'";
    if (!detail.empty()) {
      message += ": " + detail;
    }
    return MakeError(message);
  }

  // -------------------------------------------------------------------------
  // Caches directory.
  //
  // The Windows equivalent of Android's `appContext.cacheDirectory` and iOS's
  // `appContext.fileSystem.cachesDirectory`. We use the LocalCacheFolder
  // exposed by the Windows app's ApplicationData; this is the conventional
  // location for cached files that are not roamed and may be cleared by the
  // OS to free up space.
  // -------------------------------------------------------------------------

  static std::filesystem::path GetCachesDirectory() {
    auto cacheFolder = winrt::Windows::Storage::ApplicationData::Current().LocalCacheFolder();
    auto path = cacheFolder.Path();
    return std::filesystem::path(std::wstring_view(path));
  }

  // -------------------------------------------------------------------------
  // MD5 helpers (analogous to FileUtils.kt#getMD5HashOfFileContent and the
  // inline `getMD5HashOfFilePath` / `getMD5Hash(fromData:)` helpers on
  // Android/iOS).
  // -------------------------------------------------------------------------

  static std::string LowerHexFromBuffer(winrt::Windows::Storage::Streams::IBuffer const &buffer) {
    auto upperHex = winrt::Windows::Security::Cryptography::CryptographicBuffer::EncodeToHexString(buffer);
    auto hex = winrt::to_string(upperHex);
    std::transform(hex.begin(), hex.end(), hex.begin(), [](unsigned char c) {
      return static_cast<char>(std::tolower(c));
    });
    return hex;
  }

  static std::string ComputeMD5(winrt::Windows::Storage::Streams::IBuffer const &buffer) {
    using namespace winrt::Windows::Security::Cryptography::Core;
    auto provider = HashAlgorithmProvider::OpenAlgorithm(HashAlgorithmNames::Md5());
    auto hashed = provider.HashData(buffer);
    return LowerHexFromBuffer(hashed);
  }

  // Returns the lowercase hex MD5 hash of the UTF-8 bytes of `input`. Used to
  // derive a cache file id from the asset URL when no md5Hash is supplied.
  static std::string GetMD5HashOfString(std::string const &input) {
    using namespace winrt::Windows::Security::Cryptography;
    auto buffer = CryptographicBuffer::ConvertStringToBinary(
        winrt::to_hstring(input), BinaryStringEncoding::Utf8);
    return ComputeMD5(buffer);
  }

  // Returns the lowercase hex MD5 hash of the file at `path`, or std::nullopt
  // if the file cannot be read.
  static std::optional<std::string> GetMD5HashOfFileContent(std::filesystem::path const &path) noexcept {
    try {
      std::ifstream file(path, std::ios::binary);
      if (!file) {
        return std::nullopt;
      }

      using namespace winrt::Windows::Security::Cryptography::Core;
      auto provider = HashAlgorithmProvider::OpenAlgorithm(HashAlgorithmNames::Md5());
      auto hash = provider.CreateHash();

      constexpr std::size_t kBufferSize = 64 * 1024;
      std::vector<uint8_t> buffer(kBufferSize);
      while (file) {
        file.read(reinterpret_cast<char *>(buffer.data()), static_cast<std::streamsize>(buffer.size()));
        auto bytesRead = static_cast<std::size_t>(file.gcount());
        if (bytesRead == 0) {
          break;
        }
        auto chunk = winrt::Windows::Security::Cryptography::CryptographicBuffer::CreateFromByteArray(
            winrt::array_view<uint8_t const>(buffer.data(), buffer.data() + bytesRead));
        hash.Append(chunk);
      }

      return LowerHexFromBuffer(hash.GetValueAndReset());
    } catch (...) {
      return std::nullopt;
    }
  }

  // -------------------------------------------------------------------------
  // URI helpers.
  // -------------------------------------------------------------------------

  // Returns true if `url` is a file:// URL (case-insensitive scheme match).
  // Mirrors `url.isFileURL` (iOS) and `uri.scheme == "file"` (Android).
  static bool IsFileUrl(std::string const &url) noexcept {
    static constexpr std::string_view kPrefix = "file:";
    if (url.size() < kPrefix.size()) {
      return false;
    }
    for (std::size_t i = 0; i < kPrefix.size(); ++i) {
      if (std::tolower(static_cast<unsigned char>(url[i])) != kPrefix[i]) {
        return false;
      }
    }
    return true;
  }

  // Builds an absolute `file:///` URL string from a local filesystem path.
  // Mirrors `Uri.fromFile(localUrl)` (Android) / `localUrl.standardizedFileURL.absoluteString` (iOS).
  static std::string FileUrlFromPath(std::filesystem::path const &path) {
    // generic_wstring() uses forward slashes which is what file:// URLs expect.
    auto generic = path.generic_wstring();
    std::wstring url = L"file:///";
    // If the path begins with a leading '/', avoid producing "file:////".
    if (!generic.empty() && generic.front() == L'/') {
      url += generic.substr(1);
    } else {
      url += generic;
    }
    return winrt::to_string(url);
  }

  // -------------------------------------------------------------------------
  // Async download (analogous to AssetModule#downloadAsset on Android/iOS).
  // -------------------------------------------------------------------------

  static winrt::Windows::Foundation::IAsyncAction DownloadAssetAsync(
      std::string url,
      std::filesystem::path localPath,
      winrt::Microsoft::ReactNative::ReactPromise<std::string> promise) noexcept {
    // Capture the promise so it survives the suspension points below.
    auto capturedPromise = promise;

    // (1) Make sure the parent directory exists. Equivalent to
    //     `localUrl.mkdirs()` (Android) / `fileSystem.ensureDirExists(...)`
    //     (iOS).
    try {
      auto parent = localPath.parent_path();
      if (!parent.empty()) {
        std::error_code ec;
        std::filesystem::create_directories(parent, ec);
        if (ec) {
          capturedPromise.Reject(UnableToSaveAssetError(
              winrt::to_string(parent.wstring()), ec.message()));
          co_return;
        }
      }
    } catch (std::exception const &ex) {
      capturedPromise.Reject(UnableToSaveAssetError(
          winrt::to_string(localPath.wstring()), ex.what()));
      co_return;
    }

    // (2) Issue the GET request.
    winrt::Windows::Web::Http::HttpResponseMessage response{nullptr};
    try {
      auto httpClient = winrt::Windows::Web::Http::HttpClient();
      auto winrtUri = winrt::Windows::Foundation::Uri(winrt::to_hstring(url));
      response = co_await httpClient.GetAsync(winrtUri);
    } catch (winrt::hresult_error const &ex) {
      capturedPromise.Reject(UnableToDownloadAssetError(url, winrt::to_string(ex.message())));
      co_return;
    } catch (std::exception const &ex) {
      capturedPromise.Reject(UnableToDownloadAssetError(url, ex.what()));
      co_return;
    }

    // (3) Reject on non-2xx responses (Android's `response.isSuccessful`
    //     check; iOS uses `URLSession.downloadTask` which yields a nil URL on
    //     non-success).
    int statusCode = static_cast<int>(response.StatusCode());
    if (statusCode < 200 || statusCode >= 300) {
      capturedPromise.Reject(UnableToDownloadAssetError(
          url, std::string("got status ") + std::to_string(statusCode)));
      co_return;
    }

    // (4) Read body into a buffer and write it to disk atomically by writing
    //     to a temp file first and then renaming, mirroring iOS's `moveItem`
    //     after `removeItem`.
    try {
      auto buffer = co_await response.Content().ReadAsBufferAsync();

      auto parent = localPath.parent_path();
      auto folder = co_await winrt::Windows::Storage::StorageFolder::GetFolderFromPathAsync(
          winrt::to_hstring(parent.wstring()));

      // Write to "<filename>.download" first to avoid leaving a partially
      // written file at the target path on failure.
      auto tempName = localPath.filename().wstring() + L".download";
      auto tempFile = co_await folder.CreateFileAsync(
          winrt::to_hstring(tempName),
          winrt::Windows::Storage::CreationCollisionOption::ReplaceExisting);

      co_await winrt::Windows::Storage::FileIO::WriteBufferAsync(tempFile, buffer);

      // Move into place, replacing any existing file. Equivalent to
      // `try? FileManager.default.removeItem(at: localUrl)` followed by
      // `try FileManager.default.moveItem(at: fileURL, to: localUrl)` (iOS).
      co_await tempFile.MoveAsync(
          folder,
          winrt::to_hstring(localPath.filename().wstring()),
          winrt::Windows::Storage::NameCollisionOption::ReplaceExisting);

      capturedPromise.Resolve(FileUrlFromPath(localPath));
    } catch (winrt::hresult_error const &ex) {
      capturedPromise.Reject(UnableToSaveAssetError(
          winrt::to_string(localPath.wstring()), winrt::to_string(ex.message())));
    } catch (std::exception const &ex) {
      capturedPromise.Reject(UnableToSaveAssetError(
          winrt::to_string(localPath.wstring()), ex.what()));
    }
  }

  // Hooks the `Completed` callback of an IAsyncAction to surface unhandled
  // exceptions through the promise; mirrors what the previous example
  // implementation did.
  static void RejectOnAsyncFailure(
      winrt::Windows::Foundation::IAsyncAction const &asyncOp,
      winrt::Microsoft::ReactNative::ReactPromise<std::string> promise) noexcept {
    asyncOp.Completed([promise](auto action, auto status) {
      if (status == winrt::Windows::Foundation::AsyncStatus::Error) {
        std::stringstream errorCode;
        errorCode << "0x" << std::hex << action.ErrorCode();
        auto error = winrt::Microsoft::ReactNative::ReactError();
        error.Message = "HRESULT " + errorCode.str() + ": " + std::system_category().message(action.ErrorCode());
        promise.Reject(error);
      }
    });
  }

 public:
  // NOTE: this is exposed in JS as
  //   globalThis.expo.modules.ExpoAsset.downloadAsync
  // and may be consumed outside of Expo (e.g. RN vector icons), so do NOT
  // change the function signature. It must match
  //   `(url: string, md5Hash: string|null, type: string) => Promise<string>`
  // exactly, returning the resolved file URL.
  REACT_METHOD(downloadAsync);
  void downloadAsync(
      std::string url,
      std::optional<std::string> md5Hash,
      std::string type,
      winrt::Microsoft::ReactNative::ReactPromise<std::string> promise) noexcept {
    try {
      // (1) `file://` URLs resolve to themselves. Note that, unlike Android,
      //     Windows has no equivalent of the `file:///android_res/` URL form
      //     so we don't need a carve-out here.
      if (IsFileUrl(url)) {
        promise.Resolve(url);
        return;
      }

      // (2) Compute the cache file id. If a md5Hash was supplied, we use it
      //     verbatim; otherwise we hash the URL string.
      std::string cacheFileId = md5Hash.has_value() ? *md5Hash : GetMD5HashOfString(url);

      std::filesystem::path cacheDirectory;
      try {
        cacheDirectory = GetCachesDirectory();
      } catch (winrt::hresult_error const &ex) {
        promise.Reject(UnableToDownloadAssetError(url, winrt::to_string(ex.message())));
        return;
      }

      auto localPath = cacheDirectory / (std::string("ExponentAsset-") + cacheFileId + "." + type);

      // (3) Cache hit path: if the file already exists, and either no
      //     md5Hash was supplied (so we trust the cache) or the supplied
      //     md5Hash matches the file's content hash, return the cached URL.
      std::error_code ec;
      if (std::filesystem::exists(localPath, ec) && !ec) {
        bool cacheValid = !md5Hash.has_value();
        if (!cacheValid) {
          auto fileHash = GetMD5HashOfFileContent(localPath);
          cacheValid = fileHash.has_value() && *fileHash == *md5Hash;
        }
        if (cacheValid) {
          promise.Resolve(FileUrlFromPath(localPath));
          return;
        }
      }

      // (4) Otherwise, download. Errors thrown asynchronously are surfaced
      //     via the `Completed` handler.
      auto asyncOp = DownloadAssetAsync(url, std::move(localPath), promise);
      RejectOnAsyncFailure(asyncOp, promise);
    } catch (winrt::hresult_error const &ex) {
      promise.Reject(UnableToDownloadAssetError(url, winrt::to_string(ex.message())));
    } catch (std::exception const &ex) {
      promise.Reject(UnableToDownloadAssetError(url, ex.what()));
    }
  }
};

} // namespace winrt::ExpoDesktopStubs
