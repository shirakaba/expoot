import { Shescape, type ShescapeOptions } from "shescape";

const defaultShell = Symbol("Default shell");
const shescapes: Record<string | symbol, Shescape> = {};

export function getShescape(shell?: string | undefined) {
  const resolvedShell = shell ?? defaultShell;
  if (shescapes[resolvedShell]) {
    return shescapes[resolvedShell];
  }

  type Writeable<T> = { -readonly [P in keyof T]: T[P] };
  const shescapeOptions: Writeable<ShescapeOptions> = {};
  if (typeof resolvedShell === "string") {
    shescapeOptions.shell = resolvedShell;
  }

  let shescape: Shescape;
  try {
    shescape = new Shescape(shescapeOptions);
  } catch (cause) {
    if (!(cause instanceof Error) || cause.message !== "Shescape does not support the shell sh") {
      throw new Error(
        "Unable to spawn child process due to error being thrown when constructing Shescape instance",
        { cause },
      );
    }

    // Can't escape for the meta-shell `/bin/sh`. Let's try falling back to a
    // typical Unix shell and hoping for the best.
    // https://github.com/ericcornelissen/shescape/issues/2009
    try {
      shescapeOptions.shell = process.platform === "darwin" ? "zsh" : "bash";
      shescape = new Shescape(shescapeOptions);
    } catch (cause) {
      throw new Error(
        "Unable to spawn child process due to error being thrown when constructing fallback Shescape instance",
        { cause },
      );
    }
  }

  shescapes[resolvedShell] = shescape;
  return shescape;
}
