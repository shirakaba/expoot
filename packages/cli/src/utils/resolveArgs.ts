import { parseArgs } from 'node:util';

/**
 * Enables the resolution of arguments that can either be a string or a boolean.
 *
 * @param args arguments that were passed to the command.
 * @param rawMap raw map of arguments that are passed to the command.
 * @param extraArgs extra arguments and aliases that should be resolved as string or boolean.
 * @returns parsed arguments and project root.
 */
export async function resolveStringOrBooleanArgs(params: string[]) {
  const args = parseArgs({
    args: params,
    options: {
      help: {
        type: 'boolean',
        short: 'h',
      },
    },
    allowPositionals: true,
  });

  args = splitArgs(args);

  // Assert any missing arguments
  assertUnknownArgs(
    {
      ...rawMap,
      ...extraArgs,
    },
    args
  );

  // Collapse aliases into fully qualified arguments.
  args = collapseAliases(extraArgs, args);

  // Resolve all of the string or boolean arguments and the project root.
  return _resolveStringOrBooleanArgs({ ...rawMap, ...extraArgs }, args);
}
