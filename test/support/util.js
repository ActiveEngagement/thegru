import path from 'path';
import { readFile } from '../../src/core/fs_util.js';

export async function resource(filePath) {
    return await readFile(path.join('test/resources', filePath));
}