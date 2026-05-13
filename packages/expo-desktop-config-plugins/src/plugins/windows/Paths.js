const fs = require("node:fs");
const path = require("node:path");
const { sync: globSync } = require("glob");
const { withSortedGlobResult } = require("../macos/_utils/glob");
const { UnexpectedError } = require("../macos/_utils/errors");
const { addWarningWindows } = require("../macos/_utils/warnings");

const ignoredPaths = ["**/node_modules/**"];

/**
 * @param {string} projectRoot
 * @param {string | undefined} filesafeName - An explicit filesafe name,
 * otherwise will try to infer it based on the name of the vcxproj.
 */
function getAppCppFilePath(projectRoot, filesafeName) {
  /** @type {Array<string>} */
  let sortedGlobResult;
  if (filesafeName) {
    sortedGlobResult = withSortedGlobResult(
      globSync(`windows/${filesafeName}/${filesafeName}.cpp`, {
        absolute: true,
        cwd: projectRoot,
        ignore: ignoredPaths,
      }),
    );
  } else {
    const matches = globSync("windows/*/*.@(cpp|vcxproj)", {
      absolute: true,
      cwd: projectRoot,
      ignore: ignoredPaths,
    });

    /** @type {Array<string>} */
    const vcxprojFiles = [];
    /** @type {Array<string>} */
    const cppFiles = [];
    for (const match of matches) {
      if (match.endsWith(".vcxproj")) {
        vcxprojFiles.push(match);
      }
      if (match.endsWith(".cpp")) {
        cppFiles.push(match);
      }
    }

    if (vcxprojFiles.length !== 1) {
      throw new UnexpectedError(
        `Could not find the App.cpp file path, as was unable to find a singular vxcproj to infer its name from (found ${vcxprojFiles.length}). Searched in root: "${projectRoot}"`,
      );
    }
    const filesafeName = vcxprojFiles[0].replace(/\.vcxproj$/, "");

    sortedGlobResult = withSortedGlobResult(
      cppFiles.filter((file) => path.basename(file, ".cpp") === filesafeName),
    );
  }

  const [using, ...extra] = sortedGlobResult;
  if (!using) {
    throw new UnexpectedError(`Could not locate a valid App.cpp at root: "${projectRoot}"`);
  }

  if (extra.length) {
    warnMultipleFiles({
      tag: "app-cpp",
      fileName: "App.cpp",
      projectRoot,
      using,
      extra,
    });
  }

  return using;
}

/**
 * @param {string} filePath
 */
function getLanguage(filePath) {
  switch (extension) {
    case ".cpp":
      return "cpp";
    default:
      throw new UnexpectedError(`Unexpected Windows file extension: ${extension}`);
  }
}

function getFileInfo(filePath) {
  return {
    path: path.normalize(filePath),
    contents: fs.readFileSync(filePath, "utf8"),
    language: getLanguage(filePath),
  };
}

/** @param {{  tag: string, fileName: string, projectRoot?: string, using: string, extra: string[]}} param0
 */
function warnMultipleFiles({ tag, fileName, projectRoot, using, extra }) {
  const usingPath = projectRoot ? path.relative(projectRoot, using) : using;
  const extraPaths = projectRoot ? extra.map((v) => path.relative(projectRoot, v)) : extra;
  addWarningWindows(
    `paths-${tag}`,
    `Found multiple ${fileName} file paths, using "${usingPath}". Ignored paths: ${JSON.stringify(
      extraPaths,
    )}`,
  );
}

exports.getAppCppFilePath = getAppCppFilePath;
exports.getFileInfo = getFileInfo;
exports.getLanguage = getLanguage;
