import path from 'path';
import { TheGuruError } from '../../error.js';
import { toMap } from '../../util.js';
import { allowedCardInfo, allowedContainerInfo } from '../allowed_info.js';

//
// Contains utilities for creating and working with theguru card/container trees.
//

/**
 * Creates a new tree, optionally with the given children (as an object).
 */
export function root(children = undefined) {
    return {
        type: 'root',
        children: toMap(children)
    };
}

/**
 * Creates a new container, optionally with the given children (as an object), file path, and other info.
 */
export function container(children = undefined, options = {}) {
    const { file, containerType, ...info } = options;

    const nullInfo = Object.fromEntries(
        allowedContainerInfo.map(key => [key, null])
    );

    const object = {
        type: 'container',
        info: Object.assign(nullInfo, info || {}),
        children: toMap(children),
        file: file || null
    };

    if(containerType) {
        object.containerType = containerType;
    }

    return object;
}

/**
 * Creates a new card, optionally with the given file path and other info.
 */
export function card(options = {}) {
    const { file, ...info } = options;

    const nullInfo = Object.fromEntries(
        allowedCardInfo.map(key => [key, null])
    );

    return {
        type: 'card',
        info: Object.assign(nullInfo, info || {}),
        file: file || null
    };
}

/**
 * Attaches a node beneath another node under a given name.
 * 
 * This function is to a certain extent a relic of when we kept track of parents for each node. It is no longer terribly
 * useful, but it does read a little nicer.
 */
export function attach(parent, name, node) {
    parent.children.set(name, node);
}

/**
 * Traces a given path through a tree.
 * 
 * This function is useful for evaluating human-readable references to nodes.
 * 
 * For example, imagine a tree that might be textually represented like so:
 * 
 * (root)
 *   - one
 *     + aaa
 *     + bbb
 *     + ccc
 *       * target
 *   - two
 *   - three
 * 
 * A user may wish to refer to "one/ccc/target." This function will traverse each node along that path: first "one,"
 * then "ccc," then "target."
 * 
 * This function can optionally create any missing containers.
 */
export function traversePath(node, pathString, callback = undefined, options = {}) {
    callback ||= () => { };
    const makeMissing = !!options.makeMissing;

    let parentNode = node;

    // We'll keep track of these for the visitor's sake.
    let currentPath = '';
    let currentDepth = 0;

    for(const part of pathString.split('/')) {
        currentPath = path.join(currentPath, part);
        currentDepth++;

        if(!parentNode.children) {
            throw new TheGuruError('Cannot traverse a non-container node!');
        }

        let currentNode = parentNode.children.get(part);

        if(!currentNode) {
            if(makeMissing) {
                if(!currentNode) {
                    currentNode = container();
                    attach(parentNode, part, currentNode);
                }
            }
            else {
                throw new TheGuruError(`${currentPath} does not exist in the tree!`);
            }
        }

        // Yield to the visitor, with some potentially desirable information.
        const ctx = {
            path: currentPath,
            depth: currentDepth,
            parent: parentNode
        };
        callback(currentNode, ctx);

        // Step down the tree.
        parentNode = currentNode;
    }

    return parentNode;
}

/**
 * A convenience function to make any missing containers along a path.
 */
export function ensureContainerPath(node, pathString) {
    return traversePath(node, pathString, null, { makeMissing: true });
}

function _traverse(nodes, callback, initialState, async = false) {
    for(const [name, node] of nodes) {
        // Duplicate the initial state so we won't be changing the state of higher levels.
        const state = { ...initialState };

        // Advance path and depth if appropriate.

        if(state.path !== undefined) {
            state.path = path.join(state.path, name);
        }

        if(state.depth !== undefined) {
            state.depth += 1;
        }

        // Yield the node, its name, and the state to the caller.
        const result = callback(node, name, state);

        // Allow the caller to quit the traversal.
        if(result === false) {
            return false;
        }

        // Traverse each child if appropriate.
        if(node.children) {
            if(_traverse(node.children, callback, state) === false) {
                return false;
            }
        }
    }

    return true;
}

/**
 * Exposes a fluent API for traversing a tree (preorder).
 * 
 * "State" that should be kept track of for each level may be added. A "path" state is maintained by
 * default. Each level, the current name is appended to the path *for the current node and all it's children*. "depth"
 * is also maintained.
 */
export function traverse(node) {
    let initialState = { };

    function addState(name, value) {
        initialState[name] = value;

        return this;
    }

    function doFunc(callback) {
        return _traverse(node.children, callback, initialState);
    }

    addState('path', '');
    addState('depth', 0);

    return {
        state: addState,
        do: doFunc
    };
}