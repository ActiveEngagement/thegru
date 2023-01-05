import fs from 'fs';

export async function readFile(filePath) {
    return await fs.promises.readFile(filePath, { encoding: 'utf8' });
}

export async function writeFile(filePath, content) {
    return await fs.promises.writeFile(filePath, content, { encoding: 'utf8' });
}