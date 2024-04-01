import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function copyDirRecursive(source: string, destination: string): void {
  // Create destination directory if it doesn't exist
  if (!existsSync(destination)) {
    mkdirSync(destination);
  }

  // Read contents of the source directory
  const files = readdirSync(source);

  // Iterate through files/directories in the source directory
  files.forEach(file => {
    const sourcePath = join(source, file);
    const destinationPath = join(destination, file);

    // Get the stats of the current file/directory
    const stats = statSync(sourcePath);

    // If it's a file, copy it
    if (stats.isFile()) {
      // Copy the file
      copyFileSync(sourcePath, destinationPath);
    }
    // If it's a directory, recursively copy it
    else if (stats.isDirectory()) {
      copyDirRecursive(sourcePath, destinationPath);
    }
  });
}

export { copyDirRecursive };