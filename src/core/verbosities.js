//
// An "enum" of logging verbosities. Each verbosity has an id, which is also the value of its exported constant; a name,
// which is what the Action user would specify in the workflow; and a level.
//
// This file exports a number of functions that all accept verbosity ids. In this way, the exported constants
// can be given to the exported functions and everything "just works."
//

let maxId = -1; // Keep track of the latest id.
const _verbosities = {}; // The internal list of verbosities.

export const SILENT = create('silent', 0);
export const NOTICE = create('notice', 1);
export const WARNING = create('warning', 2);
export const INFO = create('info', 3);
export const DEBUG = create('debug', 4);
export const TRACE = create('trace', 5);

function create(name, level) {
    const id = (++maxId).toString(); // toString() is necessary because objects must have string keys.
    _verbosities[id] = { name, level };

    return id;
}

/**
 * Gets a list of all created verbosities.
 * 
 * If no callback is provided, then a list of ids will be returned. If a callback is provided then each id will be
 * yielded to the callback and replaced with its return value.
 */
export function verbosities(callback = null) {
    const ids = Object.keys(_verbosities);
    
    return callback ? ids.map(callback) : ids;
}

/**
 * Gets the level of a verbosity id.
 */
export function level(verbosity) {
    return _verbosities[verbosity].level;
}

/**
 * Gets the name of a verbosity id.
 */
export function name(verbosity) {
    return _verbosities[verbosity].name;
}

/**
 * Searches for a verbosity.
 * 
 * This function may seem slightly confusing at first, but it is really quite simple. A search term is compared with
 * the result of calling a callback for each verbosity id. If they are identical, then that id is returned.
 * 
 * This allows us to search for an arbitrary attribute by passing the appropriate function. For example, to search by
 * name:
 * 
 * ```
 * import { from, name } from 'verbosities.js';
 * 
 * const warning = from(name, 'warning');
 * ```
 * 
 * This saves us from having to define `fromName()`, `fromLevel()`, etc individually.
 */
export function from(callback, search) {
    return verbosities().find(t => callback(t) === search);
}