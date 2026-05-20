const { glob } = require("glob");
const { withVcxproj, withWapproj } = require("./windows-plugins");
const { withDirectoryBuildProps } = require("./withDirectoryBuildProps");

/**
 * @param {import("@expo/config-types").ExpoConfig} config
 * @param {Record<string, never>} props
 * @returns {import("@expo/config-plugins").ExportedConfig}
 */
function withReactNativeDirs(config, props = {}) {
  config = withVcxproj(config, (config) => updateProjProps(config));
  config = withWapproj(config, (config) => updateProjProps(config));

  // Writes Directory.Build.props at the project root so every native project
  // under the tree — including node_modules/<lib>/windows/<sub>/<sub>.vcxproj
  // — picks up the same ReactNativeDir / ReactNativeWindowsDir values without
  // each library's own fallback ever firing.
  config = withDirectoryBuildProps(config);

  return config;
}
module.exports.withReactNativeDirs = withReactNativeDirs;

/**
 * Update the ReactNativeDir, ReactNativeWindowsDir, and BundleEntryFile props
 * in a .vcxproj or .wapproj.
 * @param {import("@expo/config-plugins").ExportedConfigWithProps<ReturnType<import("fast-xml-parser").XMLParser["parse"]>>} config
 */
async function updateProjProps(config) {
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

  let bundleEntryFile = "index.ts";
  try {
    // Seems to order candidates as:
    // [
    //   "index.windows.tsx",
    //   "index.windows.ts",
    //   "index.windows.jsx",
    //   "index.windows.js",
    //   "index.tsx",
    //   "index.ts",
    //   "index.jsx",
    //   "index.js",
    // ]
    const candidates = await glob("index?(.windows).{ts,tsx,js,jsx}", {
      cwd: config.modRequest.projectRoot,
    });

    bundleEntryFile = candidates.at(0) ?? bundleEntryFile;
  } catch (error) {
    console.warn(
      "Unable to detect an index?(.windows).{ts,tsx,js,jsx} file in the root of the project, so will fall back to a <BundleEntryFile> value to 'index.ts'.",
      error,
    );
  }

  // It's relative to the projectRoot, not platformProjectRoot, as shown here:
  // https://github.com/jurocha-ms/react-native-windows/blob/49ad562b0f2c9fb0e00853bd6db22fc88f8c00fd/packages/integration-test-app/windows/integrationtest/integrationtest.vcxproj#L24
  const BundleEntryFileElementUpdated = {
    BundleEntryFile: [{ "#text": bundleEntryFile }],
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
