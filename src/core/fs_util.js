import fs from 'fs';
import path from 'path';

export async function readFile(filePath) {
    return await fs.promises.readFile(filePath, { encoding: 'utf8' });
}

export async function writeFile(filePath, content) {
    return await fs.promises.writeFile(filePath, content, { encoding: 'utf8' });
}

/**
 * Resolves a path from the `src` directory.
 */

export function srcUrl(filePath) {
    // `import.meta.url` is the directory of the current script. Since `fs_util.js` is under `src/core`, one directory
    // up from the current one will be the src directory.
    return new URL(filePath, path.dirname(import.meta.url));
}