import fs from 'fs';

export async function readFile(filePath) {
    return await fs.promises.readFile(filePath, { encoding: 'utf8' });
}