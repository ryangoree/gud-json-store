import { readdirSync } from "node:fs";
import { dirname } from "node:path";

/**
 * Get the path to the nearest app root directory, determined by the presence of
 * a `package.json` file.
 *
 * @param dirPath - The directory to start searching from. Defaults to the
 * current working directory.
 */
export function getProjectRoot(dirPath = process.cwd()): string {
  const dirItems = readdirSync(dirPath);
  if (dirItems.includes("package.json")) return dirPath;
  const parentDir = dirname(dirPath);
  if (parentDir === dirPath) {
    throw new Error(
      "Unable to find project root: no package.json found in any parent directory.",
    );
  }
  return getProjectRoot(parentDir);
}
