import type { TurboModule } from "react-native";

import { TurboModuleRegistry } from "react-native";

export interface Spec extends TurboModule {
  // Init()
}

export default TurboModuleRegistry.getEnforcing<Spec>("ExpoGlobal");
