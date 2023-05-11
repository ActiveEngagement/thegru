import process from 'process';
import fs from 'fs';
import path from 'path';
import { writeFile } from '../../src/core/fs_util';

/**
 * A utility function for generating a test directory tree and witching into it.
 * 
 * Generates a directory structure indicated by the given object in `test/env`. `test/env` will be emptied if it
 * already exists.
 */
export default function env(structure = {}) {
    const currentDirectory = process.cwd();
    if(currentDirectory.endsWith('test/env')) {
        process.chdir('../..');
    }

    if(fs.existsSync('test/env')) {
        fs.rmSync('test/env', { recursive: true, force: true });
    }

    fs.mkdirSync('test/env');

    function traverse(structure, basePath) {
        for(const [key, value] of Object.entries(structure)) {
            const currentPath = path.join(basePath, key);

            if(typeof value === 'string') {
                writeFile(currentPath, value);
            }
            else {
                fs.mkdirSync(currentPath);
                traverse(value, currentPath);
            }
        }
    }
    traverse(structure, 'test/env');
    process.chdir('test/env');
}