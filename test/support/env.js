import fs from 'fs';
import path from 'path';
import { writeFile } from '../../src/core/fs_util.js';

export default async function(structure = {}) {
    if(fs.existsSync('test/env')) {
        await fs.promises.rm('test/env', { recursive: true, force: true });
    }


    await fs.promises.mkdir('test/env');

    async function traverse(structure, basePath) {
        for (const [key, value] of Object.entries(structure)) {
            const currentPath = path.join(basePath, key);

            if (typeof value === 'string') {
                await writeFile(currentPath, value);
            } else {
                await fs.promises.mkdir(currentPath);
                await traverse(value, currentPath);
            }
        }
    }
    await traverse(structure, 'test/env');
}