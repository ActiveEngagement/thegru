//
// An "enum" of container types. Each type has an id, which is also the value of its exported constant; a name, which
// is what the Action user would specify in the workflow; and a level, which is its vertical distance from the root.
//
// This file exports a number of functions that all accept container type ids. In this way, the exported constants
// can be given to the exported functions and everything "just works."
//

let maxId = -1; // Keep track of the latest id.
const _types = {}; // The internal list of types.

export const BOARD_GROUP = createType('board_group', 1);
export const BOARD = createType('board', 2);
export const BOARD_SECTION = createType('board_section', 3);

function createType(name, level) {
    const id = (++maxId).toString(); // toString() is necessary because objects must have string keys.
    _types[id] = { name, level };

    return id;
}

/**
 * Gets a list of all created container types.
 * 
 * If no callback is provided, then a list of ids will be returned. If a callback is provided then each id will be
 * yielded to the callback and replaced with its return value.
 */
export function types(callback = null) {
    const ids = Object.keys(_types);
    
    return callback ? ids.map(callback) : ids;
}

/**
 * Gets the level of a container type id.
 */
export function level(type) {
    return _types[type].level;
}

/**
 * Gets the supported depth of a container type id.
 * 
 * This is the number of **containers** that could be nested beneath this container type.
 * 
 * For example, a BOARD_GROUP may have a BOARD beneath it, which may in turn have a BOARD_SECTION beneath it; so the
 * number of supported containers is 2. On the other hand, a BOARD_SECTION can have no containers beneath it, so its
 * supported depth is 0.
 */
export function supportedDepth(type) {
    return types().length - level(type);
}

/**
 * Gets the name of a container type id.
 */
export function name(type) {
    return _types[type].name;
}

/**
 * Searches for a container type.
 * 
 * This function may seem slightly confusing at first, but it is really quite simple. A search term is compared with
 * the result of calling a callback for each container type id. If they are identical, then that id is returned.
 * 
 * This allows us to search for an arbitrary attribute by passing the appropriate function. For example, to search by
 * name:
 * 
 * ```
 * import { from, name } from 'container_types.js';
 * 
 * const boardGroup = from(name, 'board_group');
 * ```
 * 
 * Or to search by supported depth:
 * 
 * ```
 * import { from, supportedDepth } from 'container_types.js';
 * 
 * const bottom = from(supportedDepth, 0);
 * ```
 * 
 * This saves us from having to define `fromName()`, `fromLevel()`, `fromSupportedDepth()`, etc individually.
 */
export function from(callback, search) {
    return types().find(t => callback(t) === search);
}