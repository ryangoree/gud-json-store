import { homedir, platform } from "node:os";
import { join } from "node:path";

/**
 * Get the path to an app specific config directory based on operating system
 * standards.
 *
 * @param projectName - The name of the project for which the config directory
 * is being created.
 */
export function getOSConfigDir(projectName: string): string {
  const home = homedir();
  const platformId = platform();
  let base: string;

  if (platformId === "win32") {
    // Windows
    // https://learn.microsoft.com/en-us/windows/apps/design/app-settings/store-and-retrieve-app-data
    // https://learn.microsoft.com/en-us/windows/uwp/get-started/fileio-learning-track#app-folders
    // https://learn.microsoft.com/en-us/windows/deployment/usmt/usmt-recognized-environment-variables#variables-that-are-recognized-only-in-the-user-context
    base = process.env.APPDATA || join(home, "AppData", "Roaming");
  } else if (platformId === "darwin") {
    // macOS
    // https://developer.apple.com/library/archive/documentation/FileManagement/Conceptual/FileSystemProgrammingGuide/MacOSXDirectories/MacOSXDirectories.html
    // https://apple.fandom.com/wiki/Application_Support_folder
    base = join(home, "Library", "Application Support");
  } else {
    // Linux and others
    // https://specifications.freedesktop.org/basedir-spec/basedir-spec-latest.html
    // https://how-to.fandom.com/wiki/Guide_to_linux_configuration_files
    base = process.env.XDG_CONFIG_HOME || join(home, ".config");
  }

  return join(base, `${projectName}`);
}
