import fs from 'fs';

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
    // `import.meta.url` is the path of the current script, which is what we want, since `fs_util.js` is in the `src`
    // directory.
    return new URL(filePath, import.meta.url);
}