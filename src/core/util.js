import path from 'path';
import globBase from 'glob';

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

export function glob(pattern, options = {}) {
    if(options.strict === undefined) {
        options.strict = true;
    }

    if(options.nomount === undefined) {
        options.nomount = true;
    }

    return globBase.sync(pattern, options);
}

export function joinNames(...names) {
    let result = '';

    for (const name of names) {
        if (name !== '') {
            result += result === '' ? name : '__' + name;
        }
    }

    return result;
}
