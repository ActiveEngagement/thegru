import path from 'path';
import { TheGuruError } from '../error.js';
import { toMap } from '../util.js';

export function root(children = undefined) {
    return {
        type: 'root',
        children: toMap(children)
    };
}

export function container(children = undefined, options = {}) {
    const { file, ...info } = options;

    return {
        type: 'container',
        info: Object.assign({
            title: null,
            description: null,
            externalUrl: null
        }, info || {}),
        children: toMap(children),
        file: file || null
    };
}

export function card(options = {}) {
    const { file, ...info } = options;

    return {
        type: 'card',
        info: Object.assign({
            title: null,
            externalUrl: null
        }, info),
        file: file || null
    };
}

export function attach(parent, name, node) {
    parent.children.set(name, node);
}

export function traversePath(node, pathString, callback = undefined) {
    callback ||= () => { };

    let currentNode = node;
    let currentPath = '';
    let currentDepth = 0;

    for(const part of pathString.split('/')) {
        currentPath = path.join(currentPath, part);
        currentDepth++;

        const ctx = {
            path: currentPath,
            depth: currentDepth
        };

        if(!currentNode.children) {
            throw new TheGuruError('Cannot traverse a non-container node!');
        }

        let nextNode = currentNode.children.get(part);

        const util = {
            makeMissing(makeCallback = undefined) {
                makeCallback ||= () => container();

                if (!nextNode) {
                    nextNode = makeCallback(ctx);
                    attach(currentNode, part, nextNode);
                }

                return nextNode;
            }
        };

        callback(nextNode, ctx, util);

        currentNode = nextNode;
    }

    return currentNode;
}


/**
 * A convenience function to make any missing containers along a path.
 */
export function ensureContainerPath(node, pathString) {
    return traversePath(node, pathString, (_node, _ctx, u) => u.makeMissing());
}

function _traverse(nodes, callback, initialState) {
    for(const [name, node] of nodes) {
        const state = { ...initialState };

        if(state.path !== undefined) {
            state.path = path.join(state.path, name);
        }

        if(state.depth !== undefined) {
            state.depth += 1;
        }

        const result = callback(node, name, state);

        if(result === false) {
            return false;
        }

        if(node.children) {
            if(_traverse(node.children, callback, state) === false) {
                return false;
            }
        }
    }

    return true;
}

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