const path = require("node:path");
const { withVcxproj } = require("./windows-plugins");
const { addWarningWindows } = require("../macos/_utils/warnings");

/**
 * @param {import("@expo/config-types").ExpoConfig} config
 * @param {Record<string, never>} props
 * @returns {import("@expo/config-plugins").ExportedConfig}
 */
function withReactNativeDirs(config, props = {}) {
  return withVcxproj(config, (config) => {
    config = updateReactNativeWindowsProps(config);

    return config;
  });
}
module.exports.withReactNativeDirs = withReactNativeDirs;

/**
 * @param {import("@expo/config-plugins").ExportedConfigWithProps<ReturnType<import("fast-xml-parser").XMLParser["parse"]>>} config
 */
function updateReactNativeWindowsProps(config) {
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
  const reactNativeWindowsAbs = path.dirname(
    require.resolve("react-native-windows/package.json", {
      paths: [config.modRequest.projectRoot],
    }),
  );
  const reactNativeWindowsRel = `$(SolutionDir)${path.win32.relative(
    config.modRequest.platformProjectRoot,
    reactNativeWindowsAbs,
  )}`;

  const ReactNativeWindowsDirElementUpdated = {
    ReactNativeWindowsDir: [{ "#text": reactNativeWindowsRel }],
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
  const reactNativeAbs = path.dirname(
    require.resolve("react-native/package.json", {
      paths: [config.modRequest.projectRoot],
    }),
  );
  const reactNativeRel = `$(SolutionDir)${path.win32.relative(config.modRequest.platformProjectRoot, reactNativeAbs)}`;
  const ReactNativeDirElementUpdated = {
    ReactNativeDir: [{ "#text": reactNativeRel }],
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

  // 5. Resolve whitespace
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
