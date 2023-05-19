import fs from 'fs';
import path from 'path';

export function readFile(filePath) {
    return fs.readFileSync(filePath, { encoding: 'utf8' });
}

export function writeFile(filePath, content) {
    return fs.writeFileSync(filePath, content, { encoding: 'utf8' });
}

/**
 * Resolves a path from the `src` directory.
 */

export function srcUrl(filePath) {
    // `import.meta.url` is the directory of the current script. Since `fs_util.js` is under `src/core`, one directory
    // up from the current one will be the src directory.
    return new URL(filePath, path.dirname(import.meta.url));
}

export function stripExtension(filePath) {
    const parsed = path.parse(filePath);
    return path.join(parsed.dir, parsed.name);
}