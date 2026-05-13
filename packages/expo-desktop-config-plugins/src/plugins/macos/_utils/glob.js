/**
 * @template T
 * @param {Array<T>} glob
 */
function withSortedGlobResult(glob) {
  return glob.sort((a, b) => a.localeCompare(b));
}

exports.withSortedGlobResult = withSortedGlobResult;
