import path from 'path';

export function base64(input) {
    return Buffer.from(input, 'utf8').toString('base64');
}

export function resolveLocalPath(url, parent) {
    if(url.startsWith('/')) {
        return url.substring(1);
    }
    if(url.startsWith('./')) {
        return resolveLocalPath(url.substring(2), parent);
    }
    if(url.startsWith('../')) {
        return resolveLocalPath(url.substring(3), path.dirname((parent)));
    }

    return path.join(parent, url);
}