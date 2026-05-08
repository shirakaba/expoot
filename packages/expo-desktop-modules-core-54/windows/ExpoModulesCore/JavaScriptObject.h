// Copyright 2022-present 650 Industries. All rights reserved.

#pragma once

#ifdef __cplusplus

#include <jsi/jsi.h>

namespace jsi = facebook::jsi;

namespace expo {

/**
 Mirrors `JavaScriptObject::preparePropertyDescriptor` from Expo Android
 (`packages/expo-modules-core/android/src/main/cpp/JavaScriptObject.cpp`).
 */
class JSI_EXPORT JavaScriptObject {
 public:
  JavaScriptObject() = delete;

  static jsi::Object preparePropertyDescriptor(jsi::Runtime &runtime, int options);
};

} // namespace expo

#endif // __cplusplus
