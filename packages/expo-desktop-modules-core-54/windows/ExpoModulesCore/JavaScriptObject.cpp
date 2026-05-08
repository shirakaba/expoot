// Copyright 2022-present 650 Industries. All rights reserved.

#include "pch.h"

#include "JavaScriptObject.h"

namespace expo {

jsi::Object JavaScriptObject::preparePropertyDescriptor(jsi::Runtime &runtime, int options) {
  jsi::Object descriptor(runtime);
  descriptor.setProperty(runtime, "configurable", (bool)((1 << 0) & options));
  descriptor.setProperty(runtime, "enumerable", (bool)((1 << 1) & options));
  if ((bool)(1 << 2 & options)) {
    descriptor.setProperty(runtime, "writable", true);
  }
  return descriptor;
}

} // namespace expo
