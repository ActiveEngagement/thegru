import fetch from 'node-fetch';
import path from 'path';


export default async function isRepoPublic(url) {
    const response = await fetch(path.join(url, '/info/refs?service=git-upload-pack'));
    return response.status === 200;
}