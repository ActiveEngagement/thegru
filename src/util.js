import fetch from 'node-fetch';
import path from 'path';

export function base64(input) {
    return Buffer.from(input, 'utf8').toString('base64');
}

export async function isRepoPublic(url) {
    const response = await fetch(path.join(url, '/info/refs?service=git-upload-pack'));
    return response.status === 200;
}
