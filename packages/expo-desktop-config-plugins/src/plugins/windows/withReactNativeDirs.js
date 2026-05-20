const { withVcxproj, withWapproj } = require("./windows-plugins");

/**
 * @param {import("@expo/config-types").ExpoConfig} config
 * @param {{ bundleEntryFileCandidates?: Array<string>; }} props
 * @returns {import("@expo/config-plugins").ExportedConfig}
 */
function withReactNativeDirs(config, props) {
  const bundleEntryFile = resolveBundleEntryFile(props.bundleEntryFileCandidates);

  config = withVcxproj(config, (config) => updateProjProps(config, { bundleEntryFile }));
  config = withWapproj(config, (config) => updateProjProps(config, { bundleEntryFile }));

  return config;
}
module.exports.withReactNativeDirs = withReactNativeDirs;

/**
 * Update the ReactNativeDir, ReactNativeWindowsDir, and BundleEntryFile props
 * in a .vcxproj or .wapproj.
 * @param {import("@expo/config-plugins").ExportedConfigWithProps<ReturnType<import("fast-xml-parser").XMLParser["parse"]>>} config
 * @param {{ bundleEntryFile?: string; }} props
 */
function updateProjProps(config, { bundleEntryFile }) {
  // 1. Find <Project>
  if (!Array.isArray(config.modResults)) {
    throw new Error("Expected parsed XML to be an array.");
  }
  const projectContainer = config.modResults.find((element) => "Project" in element);
  if (!projectContainer) {
    throw new Error("Expected parsed XML contain a <Project> element.");
  }
  const { Project } = projectContainer;
  if (!Array.isArray(Project)) {
    throw new Error("Expected <Project> element to be an array.");
  }

  // 2. Find <PropertyGroup Label="ReactNativeWindowsProps">
  const ReactNativeWindowsProps = Project.find(
    (element) =>
      "PropertyGroup" in element &&
      Array.isArray(element.PropertyGroup) &&
      element[":@"]?.["@_Label"] === "ReactNativeWindowsProps",
  )?.PropertyGroup;
  if (!ReactNativeWindowsProps) {
    throw new Error(
      'Expected there to be a <PropertyGroup Label="ReactNativeWindowsProps"> element inside the <Project>.',
    );
  }
  const lengthBefore = ReactNativeWindowsProps.length;

  // 3. Ensure there is a <ReactNativeWindowsDir> element.
  const ReactNativeWindowsDirElementIndex = ReactNativeWindowsProps.findIndex(
    (element) => "ReactNativeWindowsDir" in element,
  );

  const ReactNativeWindowsDirElementUpdated = {
    ReactNativeWindowsDir: [
      {
        "#text":
          "$([MSBuild]::GetDirectoryNameOfFileAbove($(MSBuildThisFileDirectory), 'node_modules\\react-native-windows\\package.json'))\\node_modules\\react-native-windows\\",
      },
    ],
    ":@": { "@_Condition": "'$(ReactNativeWindowsDir)' == ''" },
  };
  if (ReactNativeWindowsDirElementIndex === -1) {
    // If there's insufficient whitespace after the last XML element, add some.
    const precedingNode = ReactNativeWindowsProps.at(-1);
    const whitespace = "\n    ";
    if (typeof precedingNode?.["#text"] !== "string") {
      ReactNativeWindowsProps.push({ "#text": whitespace });
    } else {
      precedingNode["#text"] = whitespace;
    }
    ReactNativeWindowsProps.push(ReactNativeWindowsDirElementUpdated);
  } else {
    ReactNativeWindowsProps.splice(
      ReactNativeWindowsDirElementIndex,
      1,
      ReactNativeWindowsDirElementUpdated,
    );
  }

  // 4. Ensure there is a <ReactNativeDir> element.
  const ReactNativeDirElementIndex = ReactNativeWindowsProps.findIndex(
    (element) => "ReactNativeDir" in element,
  );
  const ReactNativeDirElementUpdated = {
    ReactNativeDir: [
      {
        "#text":
          "$([MSBuild]::GetDirectoryNameOfFileAbove($(MSBuildThisFileDirectory), 'node_modules\\react-native\\package.json'))\\node_modules\\react-native\\",
      },
    ],
    ":@": { "@_Condition": "'$(ReactNativeDir)' == ''" },
  };
  if (ReactNativeDirElementIndex === -1) {
    // If there's insufficient whitespace after the last XML element, add some.
    const precedingNode = ReactNativeWindowsProps.at(-1);
    const whitespace = "\n    ";
    if (typeof precedingNode?.["#text"] !== "string") {
      ReactNativeWindowsProps.push({ "#text": whitespace });
    } else {
      precedingNode["#text"] = whitespace;
    }
    ReactNativeWindowsProps.push(ReactNativeDirElementUpdated);
  } else {
    ReactNativeWindowsProps.splice(ReactNativeDirElementIndex, 1, ReactNativeDirElementUpdated);
  }

  // 5. Ensure there is a <BundleEntryFile> element.
  const BundleEntryFileElementIndex = ReactNativeWindowsProps.findIndex(
    (element) => "BundleEntryFile" in element,
  );

  // It's relative to the projectRoot, not platformProjectRoot, as shown here:
  // https://github.com/jurocha-ms/react-native-windows/blob/49ad562b0f2c9fb0e00853bd6db22fc88f8c00fd/packages/integration-test-app/windows/integrationtest/integrationtest.vcxproj#L24
  const BundleEntryFileElementUpdated = {
    BundleEntryFile: [{ "#text": bundleEntryFile ?? "index.ts" }],
    ":@": { "@_Condition": "'$(BundleEntryFile)' == ''" },
  };
  if (BundleEntryFileElementIndex === -1) {
    // If there's insufficient whitespace after the last XML element, add some.
    const precedingNode = ReactNativeWindowsProps.at(-1);
    const whitespace = "\n    ";
    if (typeof precedingNode?.["#text"] !== "string") {
      ReactNativeWindowsProps.push({ "#text": whitespace });
    } else {
      precedingNode["#text"] = whitespace;
    }
    ReactNativeWindowsProps.push(BundleEntryFileElementUpdated);
  } else {
    ReactNativeWindowsProps.splice(BundleEntryFileElementIndex, 1, BundleEntryFileElementUpdated);
  }

  // 6. Resolve whitespace
  if (ReactNativeWindowsProps.length > lengthBefore) {
    // Ensure sufficient indentation after opening <PropertyGroup>.
    const leadingNode = ReactNativeWindowsProps.at(0);
    const whitespace = "\n    ";
    if (typeof leadingNode?.["#text"] !== "string") {
      ReactNativeWindowsProps.push({ "#text": whitespace });
    } else {
      leadingNode["#text"] = whitespace;
    }

    // Provide the indentation before closing </PropertyGroup>.
    ReactNativeWindowsProps.push({ "#text": "\n  " });
  }

  return config;
}

/**
 * Resolves the best React Native Windows bundle entry file from a list of
 * candidates.
 *
 * - Preference order (platform suffix): .windows > .native > (none)
 * - File extension (ts/tsx/js/jsx) is treated as equal priority.
 * - Candidates with non-Windows platform suffixes (.ios, .android, .macos) are
 *   excluded.
 *
 * @param {string[]} [bundleEntryFileCandidates] - List of candidate filenames
 * to evaluate.
 * @returns {string} The highest-priority matching filename, or `"index.ts"` if
 * none match.
 */
function resolveBundleEntryFile(bundleEntryFileCandidates) {
  if (!bundleEntryFileCandidates) {
    return "index.ts";
  }

  const platformSuffix = /(?:(\.windows|\.native|\.ios|\.android|\.macos))?\.(?:js|ts|jsx|tsx)$/;

  /**
   * @type {Record<string, number>}
   * Priority order for React Native Windows entrypoint resolution.
   * Lower index = higher priority.
   */
  const WINDOWS_PLATFORM_PRIORITY = {
    ".windows": 0,
    ".native": 1,
    "": 2,
  };

  const sortedCandidates = bundleEntryFileCandidates
    .filter((candidate) => {
      const match = platformSuffix.exec(candidate);
      if (!match) return false;
      const suffix = match.at(1) ?? "";
      // Keep only Windows-compatible candidates
      return suffix === ".windows" || suffix === ".native" || suffix === "";
    })
    .sort((a, b) => {
      const suffixA = platformSuffix.exec(a)?.at(1) ?? "";
      const suffixB = platformSuffix.exec(b)?.at(1) ?? "";
      return WINDOWS_PLATFORM_PRIORITY[suffixA] - WINDOWS_PLATFORM_PRIORITY[suffixB];
    });

  return sortedCandidates.at(0) ?? "index.ts";
}
