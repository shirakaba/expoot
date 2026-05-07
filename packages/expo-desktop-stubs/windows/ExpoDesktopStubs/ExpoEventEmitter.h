// Port of expo-modules-core's `EventEmitter` to React Native Windows.
//
// Sources:
//   * apps/demo/node_modules/expo-modules-core/common/cpp/EventEmitter.h
//   * apps/demo/node_modules/expo-modules-core/common/cpp/EventEmitter.cpp
//   * apps/demo/node_modules/expo-modules-core/common/cpp/JSIUtils.{h,cpp}
//
// The behaviour mirrors expo-modules-core@>=2.0 line for line, with two
// differences that matter only on Windows:
//
//   1. `LazyObject::unwrapObjectIfNecessary` becomes the identity, because
//      expo-desktop-stubs does not yet ship the `LazyObject` host object that
//      expo-modules-core uses to wrap native modules. Until that is ported
//      (alongside `ExpoModulesHostObject`), every `this` we see here is the
//      already-resolved emitter object, so unwrapping is a no-op.
//
//   2. `facebook::react::handleJSError` from
//      `<cxxreact/ErrorUtils.h>` is replaced with an inlined equivalent so
//      that we don't depend on RN core headers being on the include path of
//      consumers of this stubs package.
//
// All functions are marked `inline` so this header may be included from
// multiple translation units without violating ODR.

#pragma once

#include "pch.h"

#include <jsi/jsi.h>

#include <list>
#include <memory>
#include <sstream>
#include <string>
#include <unordered_map>
#include <vector>

namespace jsi = facebook::jsi;

namespace winrt::ExpoDesktopStubs::EventEmitter {

#pragma region handleJSError

// Inlined, header-safe equivalent of `facebook::react::handleJSError(rt, e,
// false)` from `<cxxreact/ErrorUtils.h>`. We dispatch to `ErrorUtils.reportError`
// (the same global RN sets up) when present, and otherwise fall through to
// `OutputDebugStringA`. We deliberately swallow any further failures: just like
// in the upstream Expo implementation, a misbehaving listener must not stop the
// remaining listeners from running.
inline void handleJSError(jsi::Runtime &runtime, const jsi::JSError &error) noexcept {
  try {
    jsi::Value errorUtilsValue = runtime.global().getProperty(runtime, "ErrorUtils");
    if (errorUtilsValue.isObject()) {
      jsi::Object errorUtils = errorUtilsValue.getObject(runtime);
      if (errorUtils.hasProperty(runtime, "reportError")) {
        errorUtils
            .getPropertyAsFunction(runtime, "reportError")
            .callWithThis(runtime, errorUtils, {jsi::Value(runtime, error.value())});
        return;
      }
    }
  } catch (...) {
    // Fall through to the OutputDebugString path below.
  }

  try {
    std::string message = "[ExpoEventEmitter] Listener threw: " + error.getMessage() + "\n";
    OutputDebugStringA(message.c_str());
  } catch (...) {
    // Nothing more we can do.
  }
}

#pragma endregion // handleJSError

#pragma region unwrapObjectIfNecessary

// Mirrors `expo::LazyObject::unwrapObjectIfNecessary`. expo-desktop-stubs has
// no `LazyObject` yet so this is the identity. Kept as a function for parity
// with the upstream call sites and to give us a single seam to add real
// unwrapping when `ExpoModulesHostObject` lands.
inline const jsi::Object &unwrapObjectIfNecessary(jsi::Runtime & /*runtime*/, const jsi::Object &object) noexcept {
  return object;
}

#pragma endregion // unwrapObjectIfNecessary

#pragma region Listeners

/**
 * Class containing and managing listeners of the event emitter.
 */
class Listeners {
 private:
  using ListenersList = std::list<jsi::Value>;
  using ListenersMap = std::unordered_map<std::string, ListenersList>;

  ListenersMap listenersMap;

 public:
  inline void add(jsi::Runtime &runtime, const std::string &eventName, const jsi::Function &listener) noexcept {
    listenersMap[eventName].emplace_back(runtime, listener);
  }

  inline void remove(jsi::Runtime &runtime, const std::string &eventName, const jsi::Function &listener) noexcept {
    auto it = listenersMap.find(eventName);
    if (it == listenersMap.end()) {
      return;
    }
    jsi::Value listenerValue(runtime, listener);
    it->second.remove_if(
        [&](const jsi::Value &item) { return jsi::Value::strictEquals(runtime, listenerValue, item); });
  }

  inline void removeAll(const std::string &eventName) noexcept {
    auto it = listenersMap.find(eventName);
    if (it != listenersMap.end()) {
      it->second.clear();
    }
  }

  inline void clear() noexcept {
    listenersMap.clear();
  }

  inline size_t listenersCount(const std::string &eventName) noexcept {
    auto it = listenersMap.find(eventName);
    return it == listenersMap.end() ? 0 : it->second.size();
  }

  inline void call(
      jsi::Runtime &runtime,
      const std::string &eventName,
      const jsi::Object &thisObject,
      const jsi::Value *args,
      size_t count) noexcept {
    auto it = listenersMap.find(eventName);
    if (it == listenersMap.end()) {
      return;
    }
    ListenersList &listenersList = it->second;
    size_t listSize = listenersList.size();

    if (listSize == 0) {
      return;
    }
    if (listSize == 1) {
      // Hot path: only one listener, call directly without the snapshot copy.
      try {
        listenersList.front().asObject(runtime).asFunction(runtime).callWithThis(runtime, thisObject, args, count);
      } catch (jsi::JSError &error) {
        handleJSError(runtime, error);
      }
      return;
    }

    // Snapshot the listener list before iterating in case a listener mutates
    // it. Newly-added listeners are not called this round; newly-removed
    // listeners are still called once, matching Node.js' EventEmitter.
    std::vector<jsi::Function> listenersVector;
    listenersVector.reserve(listSize);
    for (const jsi::Value &listener : listenersList) {
      listenersVector.push_back(listener.asObject(runtime).asFunction(runtime));
    }

    for (const jsi::Function &listener : listenersVector) {
      // A listener that throws does not stop subsequent listeners; the error
      // is reported but not propagated, matching the web `EventTarget`
      // contract that expo-modules-core follows.
      try {
        listener.callWithThis(runtime, thisObject, args, count);
      } catch (jsi::JSError &error) {
        handleJSError(runtime, error);
      }
    }
  }
};

#pragma endregion // Listeners

#pragma region NativeState

/**
 * Native state attached to every event emitter object via `jsi::NativeState`.
 * Stores the listeners keyed by event name.
 */
class NativeState : public jsi::NativeState {
 public:
  using Shared = std::shared_ptr<NativeState>;

  NativeState() = default;

  ~NativeState() override {
    listeners.clear();
  }

  Listeners listeners;

  /**
   * Gets the event emitter's native state from the given object.
   * If `createIfMissing` is set to `true`, the state will be automatically created.
   */
  inline static Shared get(jsi::Runtime &runtime, const jsi::Object &object, bool createIfMissing = false) {
    if (object.hasNativeState<NativeState>(runtime)) {
      return object.getNativeState<NativeState>(runtime);
    }
    if (createIfMissing) {
      Shared state = std::make_shared<NativeState>();
      object.setNativeState(runtime, state);
      return state;
    }
    return nullptr;
  }
};

#pragma endregion // NativeState

#pragma region Internals

inline void callObservingFunction(
    jsi::Runtime &runtime,
    const jsi::Object &object,
    const char *functionName,
    const std::string &eventName) {
  jsi::Value fnValue = object.getProperty(runtime, functionName);
  if (!fnValue.isObject()) {
    return;
  }
  fnValue.getObject(runtime).asFunction(runtime).callWithThis(
      runtime,
      object,
      {jsi::Value(runtime, jsi::String::createFromUtf8(runtime, eventName))});
}

inline void addListener(
    jsi::Runtime &runtime,
    const jsi::Object &emitter,
    const std::string &eventName,
    const jsi::Function &listener) {
  if (NativeState::Shared state = NativeState::get(runtime, emitter, /*createIfMissing*/ true)) {
    state->listeners.add(runtime, eventName, listener);

    if (state->listeners.listenersCount(eventName) == 1) {
      callObservingFunction(runtime, emitter, "__expo_onStartListeningToEvent", eventName);
      callObservingFunction(runtime, emitter, "startObserving", eventName);
    }
  }
}

inline void removeListener(
    jsi::Runtime &runtime,
    const jsi::Object &emitter,
    const std::string &eventName,
    const jsi::Function &listener) {
  if (NativeState::Shared state = NativeState::get(runtime, emitter, /*createIfMissing*/ false)) {
    size_t listenersCountBefore = state->listeners.listenersCount(eventName);
    state->listeners.remove(runtime, eventName, listener);

    if (listenersCountBefore >= 1 && state->listeners.listenersCount(eventName) == 0) {
      callObservingFunction(runtime, emitter, "__expo_onStopListeningToEvent", eventName);
      callObservingFunction(runtime, emitter, "stopObserving", eventName);
    }
  }
}

inline void removeAllListeners(jsi::Runtime &runtime, const jsi::Object &emitter, const std::string &eventName) {
  if (NativeState::Shared state = NativeState::get(runtime, emitter, /*createIfMissing*/ false)) {
    size_t listenersCountBefore = state->listeners.listenersCount(eventName);
    state->listeners.removeAll(eventName);

    if (listenersCountBefore >= 1) {
      callObservingFunction(runtime, emitter, "__expo_onStopListeningToEvent", eventName);
      callObservingFunction(runtime, emitter, "stopObserving", eventName);
    }
  }
}

inline void emitEvent(
    jsi::Runtime &runtime,
    const jsi::Object &emitter,
    const std::string &eventName,
    const jsi::Value *args,
    size_t count) {
  if (NativeState::Shared state = NativeState::get(runtime, emitter, /*createIfMissing*/ false)) {
    state->listeners.call(runtime, eventName, emitter, args, count);
  }
}

inline size_t getListenerCount(jsi::Runtime &runtime, const jsi::Object &emitter, const std::string &eventName) {
  if (NativeState::Shared state = NativeState::get(runtime, emitter, /*createIfMissing*/ false)) {
    return state->listeners.listenersCount(eventName);
  }
  return 0;
}

inline jsi::Value createEventSubscription(
    jsi::Runtime &runtime,
    const std::string &eventName,
    const jsi::Object &emitter,
    const jsi::Function &listener) {
  jsi::Object subscription(runtime);
  jsi::PropNameID removeProp = jsi::PropNameID::forAscii(runtime, "remove", 6);
  std::shared_ptr<jsi::Value> emitterValue = std::make_shared<jsi::Value>(runtime, emitter);
  std::shared_ptr<jsi::Value> listenerValue = std::make_shared<jsi::Value>(runtime, listener);

  jsi::HostFunctionType removeSubscription =
      [eventName, emitterValue, listenerValue](
          jsi::Runtime &runtime, const jsi::Value & /*thisValue*/, const jsi::Value * /*args*/, size_t /*count*/)
      -> jsi::Value {
    jsi::Object emitterObj = emitterValue->getObject(runtime);
    jsi::Function listenerFn = listenerValue->getObject(runtime).getFunction(runtime);
    removeListener(runtime, emitterObj, eventName, listenerFn);
    return jsi::Value::undefined();
  };

  subscription.setProperty(
      runtime,
      removeProp,
      jsi::Function::createFromHostFunction(runtime, removeProp, 0, removeSubscription));

  return jsi::Value(runtime, subscription);
}

#pragma endregion // Internals

#pragma region Class plumbing

// Mirrors `expo::common::createClass` from JSIUtils.cpp. A native class is
// implemented as a JS function that bounces straight to a private hidden host
// constructor; this gives us subclassable, prototype-aware semantics without
// having to mint a host object per instance.
inline jsi::Function createClass(
    jsi::Runtime &runtime,
    const char *name,
    std::function<jsi::Value(jsi::Runtime &, const jsi::Value &, const jsi::Value *, size_t)> constructor) {
  static constexpr const char *nativeConstructorKey = "__native_constructor__";

  std::stringstream source;
  source << "(function " << name << "(...args) { return this." << nativeConstructorKey << "(...args); })";
  auto sourceBuffer = std::make_shared<jsi::StringBuffer>(source.str());

  jsi::Object klass = runtime.evaluateJavaScript(sourceBuffer, "").asObject(runtime);
  jsi::Object prototype = klass.getPropertyAsObject(runtime, "prototype");

  jsi::PropNameID nativeConstructorPropId = jsi::PropNameID::forAscii(runtime, nativeConstructorKey);
  jsi::Function nativeConstructor = jsi::Function::createFromHostFunction(
      runtime,
      nativeConstructorPropId,
      // `length` is informational only; the actual paramCount doesn't have to
      // match. `0` matches expo-modules-core's behaviour.
      0,
      [constructor = std::move(constructor)](
          jsi::Runtime &runtime,
          const jsi::Value &thisValue,
          const jsi::Value *args,
          size_t count) -> jsi::Value {
        if (constructor) {
          return constructor(runtime, thisValue, args, count);
        }
        return jsi::Value(runtime, thisValue);
      });

  // Define `prototype.__native_constructor__` non-enumerably so it doesn't show
  // up in `for..in`/`Object.keys`.
  jsi::Object descriptor(runtime);
  descriptor.setProperty(runtime, "value", jsi::Value(runtime, nativeConstructor));

  jsi::Object objectClass = runtime.global().getPropertyAsObject(runtime, "Object");
  jsi::Function definePropertyFunction = objectClass.getPropertyAsFunction(runtime, "defineProperty");
  definePropertyFunction.callWithThis(
      runtime,
      objectClass,
      {jsi::Value(runtime, prototype),
       jsi::String::createFromUtf8(runtime, nativeConstructorKey),
       std::move(descriptor)});

  return klass.asFunction(runtime);
}

#pragma endregion // Class plumbing

#pragma region Public API

/**
 * Emits an event with the given name and arguments on the emitter object.
 * Does nothing if the given object is not an instance of the EventEmitter class.
 *
 * Mirrors the public `expo::EventEmitter::emitEvent` overload that takes a
 * `std::vector`.
 */
inline void emitEvent(
    jsi::Runtime &runtime,
    jsi::Object &emitter,
    const std::string &eventName,
    const std::vector<jsi::Value> &arguments) {
  emitEvent(runtime, emitter, eventName, arguments.data(), arguments.size());
}

/**
 * Gets the `expo.EventEmitter` class from the given runtime. Asserts that
 * `installClass` has already been run.
 */
inline jsi::Function getClass(jsi::Runtime &runtime) {
  return runtime.global()
      .getPropertyAsObject(runtime, "expo")
      .getPropertyAsFunction(runtime, "EventEmitter");
}

/**
 * Installs the `expo.EventEmitter` class on the runtime's `global.expo`
 * object. Must be called after `global.expo` has been created (we do that
 * from `ExpoGlobal::Initialize` before this is invoked).
 */
inline void installClass(jsi::Runtime &runtime) {
  jsi::Function eventEmitterClass = createClass(
      runtime,
      "EventEmitter",
      [](jsi::Runtime &runtime, const jsi::Value &thisValue, const jsi::Value *args, size_t count) -> jsi::Value {
        // Backwards-compatibility with the legacy Expo SDK <=51 EventEmitter,
        // where the native module object was passed in as the constructor
        // argument. If the caller hands us an existing emitter, return it
        // verbatim instead of wrapping it again.
        if (count > 0 && args[0].isObject()) {
          const jsi::Object &tmp = args[0].asObject(runtime);
          const jsi::Object &firstArg = unwrapObjectIfNecessary(runtime, tmp);

          jsi::Function constructor =
              thisValue.getObject(runtime).getPropertyAsFunction(runtime, "constructor");

          if (firstArg.instanceOf(runtime, constructor)) {
            return jsi::Value(runtime, args[0]);
          }
        }
        return jsi::Value(runtime, thisValue);
      });

  jsi::Object prototype = eventEmitterClass.getPropertyAsObject(runtime, "prototype");

  jsi::HostFunctionType addListenerHost =
      [](jsi::Runtime &runtime, const jsi::Value &thisValue, const jsi::Value *args, size_t /*count*/)
      -> jsi::Value {
    std::string eventName = args[0].asString(runtime).utf8(runtime);
    jsi::Function listener = args[1].asObject(runtime).asFunction(runtime);
    jsi::Object thisObject = thisValue.getObject(runtime);

    // `this` may be a host-object wrapper (e.g. `LazyObject`) when this lands
    // alongside `ExpoModulesHostObject`; until then it's a no-op.
    const jsi::Object &emitter = unwrapObjectIfNecessary(runtime, thisObject);

    addListener(runtime, emitter, eventName, listener);
    return createEventSubscription(runtime, eventName, emitter, listener);
  };

  jsi::HostFunctionType removeListenerHost =
      [](jsi::Runtime &runtime, const jsi::Value &thisValue, const jsi::Value *args, size_t /*count*/)
      -> jsi::Value {
    std::string eventName = args[0].asString(runtime).utf8(runtime);
    jsi::Function listener = args[1].asObject(runtime).asFunction(runtime);
    jsi::Object thisObject = thisValue.getObject(runtime);

    const jsi::Object &emitter = unwrapObjectIfNecessary(runtime, thisObject);

    removeListener(runtime, emitter, eventName, listener);
    return jsi::Value::undefined();
  };

  jsi::HostFunctionType removeAllListenersHost =
      [](jsi::Runtime &runtime, const jsi::Value &thisValue, const jsi::Value *args, size_t /*count*/)
      -> jsi::Value {
    std::string eventName = args[0].asString(runtime).utf8(runtime);
    jsi::Object thisObject = thisValue.getObject(runtime);

    const jsi::Object &emitter = unwrapObjectIfNecessary(runtime, thisObject);

    removeAllListeners(runtime, emitter, eventName);
    return jsi::Value::undefined();
  };

  jsi::HostFunctionType emit =
      [](jsi::Runtime &runtime, const jsi::Value &thisValue, const jsi::Value *args, size_t count) -> jsi::Value {
    std::string eventName = args[0].asString(runtime).utf8(runtime);
    jsi::Object thisObject = thisValue.getObject(runtime);

    const jsi::Object &emitter = unwrapObjectIfNecessary(runtime, thisObject);

    // Skip the first arg (event name); pass the rest to the listeners.
    const jsi::Value *eventArgs = count > 1 ? &args[1] : nullptr;
    size_t eventArgCount = count > 0 ? count - 1 : 0;

    emitEvent(runtime, emitter, eventName, eventArgs, eventArgCount);
    return jsi::Value::undefined();
  };

  jsi::HostFunctionType listenerCountHost =
      [](jsi::Runtime &runtime, const jsi::Value &thisValue, const jsi::Value *args, size_t /*count*/)
      -> jsi::Value {
    std::string eventName = args[0].asString(runtime).utf8(runtime);
    jsi::Object thisObject = thisValue.getObject(runtime);

    const jsi::Object &emitter = unwrapObjectIfNecessary(runtime, thisObject);

    return jsi::Value(static_cast<int>(getListenerCount(runtime, emitter, eventName)));
  };

  // Compatibility shim for the pre-SDK 52 API surface where listeners were
  // removed by handing the subscription back to the emitter.
  jsi::HostFunctionType removeSubscriptionHost =
      [](jsi::Runtime &runtime, const jsi::Value & /*thisValue*/, const jsi::Value *args, size_t /*count*/)
      -> jsi::Value {
    jsi::Object subscription = args[0].asObject(runtime);
    subscription.getProperty(runtime, "remove")
        .asObject(runtime)
        .asFunction(runtime)
        .callWithThis(runtime, subscription, {});
    return jsi::Value::undefined();
  };

  jsi::PropNameID addListenerProp = jsi::PropNameID::forAscii(runtime, "addListener", 11);
  jsi::PropNameID removeListenerProp = jsi::PropNameID::forAscii(runtime, "removeListener", 14);
  jsi::PropNameID removeAllListenersProp = jsi::PropNameID::forAscii(runtime, "removeAllListeners", 18);
  jsi::PropNameID emitProp = jsi::PropNameID::forAscii(runtime, "emit", 4);
  jsi::PropNameID listenerCountProp = jsi::PropNameID::forAscii(runtime, "listenerCount", 13);
  jsi::PropNameID removeSubscriptionProp = jsi::PropNameID::forAscii(runtime, "removeSubscription", 18);

  prototype.setProperty(
      runtime,
      addListenerProp,
      jsi::Function::createFromHostFunction(runtime, addListenerProp, 2, addListenerHost));
  prototype.setProperty(
      runtime,
      removeListenerProp,
      jsi::Function::createFromHostFunction(runtime, removeListenerProp, 2, removeListenerHost));
  prototype.setProperty(
      runtime,
      removeAllListenersProp,
      jsi::Function::createFromHostFunction(runtime, removeAllListenersProp, 1, removeAllListenersHost));
  prototype.setProperty(
      runtime, emitProp, jsi::Function::createFromHostFunction(runtime, emitProp, 2, emit));
  prototype.setProperty(
      runtime,
      listenerCountProp,
      jsi::Function::createFromHostFunction(runtime, listenerCountProp, 1, listenerCountHost));
  prototype.setProperty(
      runtime,
      removeSubscriptionProp,
      jsi::Function::createFromHostFunction(runtime, removeSubscriptionProp, 1, removeSubscriptionHost));

  // Attach the class to `globalThis.expo.EventEmitter`. `global.expo` is set
  // up by `ExpoGlobal::Initialize` before this runs.
  runtime.global().getPropertyAsObject(runtime, "expo").setProperty(runtime, "EventEmitter", eventEmitterClass);
}

#pragma endregion // Public API

} // namespace winrt::ExpoDesktopStubs::EventEmitter
