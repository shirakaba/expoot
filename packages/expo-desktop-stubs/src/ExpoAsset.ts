import type { TurboModule } from "react-native";

import { TurboModuleRegistry } from "react-native";

export interface Spec extends TurboModule {
  downloadAsync(
    url: string,
    md5Hash: string | null,
    type: string,
    callback: (value: string) => void,
  ): void;
}

export default TurboModuleRegistry.getEnforcing<Spec>("ExpoAsset");
