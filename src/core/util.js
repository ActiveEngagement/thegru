import path from 'path';
import globBase from 'glob';
import { stripExtension } from './fs_util.js';

export function base64(input) {
    return Buffer.from(input, 'utf8').toString('base64');
}

/**
 * Resolves a path potentially containing `/`, `./`, or `../`.
 */
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

export function isLocalUrl(url) {
    const http = url.startsWith('http://') || url.startsWith('https://');
    const internal = url.startsWith('#');
    const email = url.startsWith('mailto');

    return !(http || internal || email);
}

/**
 * Gets a list of files matching the given glob. Delegates to `glob`, with some default options.
 */
export function glob(pattern, options = {}) {
    if(options.strict === undefined) {
        options.strict = true;
    }

    if(options.nomount === undefined) {
        options.nomount = true;
    }

    return globBase.sync(pattern, options);
}

/**
 * Intelligently joins two card/container names together with a double-underscore.
 */
export function joinNames(...names) {
    let result = '';

    for(let name of names) {
        if(name !== '') {
            name = stripExtension(name);
            result += result === '' ? name : '__' + name;
        }
    }

    return result;
}

/**
 * Exposes a fluent interface for attempting to execute a closure. Specific exception types may be caught by class.
 * 
 * The motivation for this function is the JavaScript try statement's inability to catch specific exceptions.
 */

export function attempt() {
    const catchers = [];

    function catchFunc(klass, callback) {
        catchers.push({ klass, callback });

        return this;
    }

    function catchAll(callback) {
        return this.catch(null, callback);
    }

    async function doFunc(callback) {
        try {
            return await callback();
        }
        catch (e) {
            for(const catcher of catchers) {
                if(catcher.klass === null || e instanceof catcher.klass) {
                    return await catcher.callback(e);
                }
            }

            throw e;
        }
    }

    function doSync(callback) {
        try {
            return callback();
        }
        catch (e) {
            for(const catcher of catchers) {
                if(catcher.klass === null || e instanceof catcher.klass) {
                    return catcher.callback(e);
                }
            }

            throw e;
        }
    }

    return { catch: catchFunc, catchAll, do: doFunc, doSync };
}

/**
 * Converts an object to a map. Returns a new map if the object is falsy.
 */
export function toMap(object) {
    return object ? new Map(Object.entries(object)) : new Map();
}