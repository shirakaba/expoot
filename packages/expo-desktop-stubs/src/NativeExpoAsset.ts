import type { TurboModule } from "react-native";

import { TurboModuleRegistry } from "react-native";

export interface Spec extends TurboModule {
  // https://github.com/microsoft/react-native-windows-samples/blob/8e327b591e3f4895988d9b65018fda2519152892/samples/NativeModuleSample/cpp-lib/src/NativeSimpleHttpModule.ts#L13
  downloadAsync(url: string, md5Hash: string | null, type: string): Promise<string>;
}

export default TurboModuleRegistry.getEnforcing<Spec>("ExpoAsset");
