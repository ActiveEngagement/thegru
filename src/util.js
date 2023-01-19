import fetch from 'node-fetch';
import path from 'path';

export function pick(obj, ...keys) {
    return Object.fromEntries(
        keys
            .flatMap(e => {
                if(typeof e === 'string') {
                    return e in obj ? [[e, obj[e]]] : [];
                }
                else {
                    return Object.entries(e).map(([key, val]) => [key, obj[val]]);
                }
            })
    );
}

export async function isRepoPublic(url) {
    const response = await fetch(path.join(url, '/info/refs?service=git-upload-pack'));
    return response.status === 200;
}
