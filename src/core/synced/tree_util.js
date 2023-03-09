import fs from 'fs';
import path from 'path';
import { TheGuruError } from '../error.js';

export function root(children = undefined) {
    return {
        type: 'root',
        children: children ? new Map(Object.entries(children)) : new Map()
    };
}

export function container(children = undefined, info = {}) {
    return {
        type: 'container',
        info: Object.assign({
            title: null,
            description: null,
            externalUrl: null
        }, info || {}),
        children: children ? new Map(Object.entries(children)) : new Map()
    };
}

export function card(options = {}) {
    const { content, file, ...info } = options;

    return {
        type: 'card',
        info: Object.assign({
            title: null,
            externalUrl: null
        }, info),
        content: content || null,
        file: file || null
    };
}

export function attach(parent, name, node) {
    parent.children.set(name, node);
}

export function traversePath(node, pathString) {
    let makeParents = false;
    let delimiter = '/';
    let onCreate = () => { };

    function enableMakeParents() {
        makeParents = true;

        return this;
    }

    function setDelimiter(newDelimiter) {
        if (newDelimiter) {
            delimiter = newDelimiter;
        }

        return this;
    }

    function setOnCreate(newOnCreate) {
        onCreate = newOnCreate;

        return this;
    }

    function doFunc(callback = undefined) {
        callback ||= () => { };

        let currentNode = node;
        let currentPath = '';
        let currentDepth = 0;

        for (const part of pathString.split(delimiter)) {
            currentPath = path.join(currentPath, part);
            currentDepth++;

            const ctx = {
                path: currentPath,
                depth: currentDepth
            };

            if (!currentNode.children) {
                throw new TheGuruError('Cannot traverse a non-container node!');
            }

            let nextNode = currentNode.children.get(part);

            if (!nextNode) {
                if (makeParents) {
                    nextNode = container();
                    attach(currentNode, part, nextNode);
                    onCreate(nextNode, ctx);
                } else {
                    throw new TheGuruError(`Encountered nonexistent part "${part}" while traversing path "${path}"!`);
                }
            }

            callback(nextNode, ctx);

            currentNode = nextNode;
        }

        return currentNode;
    }

    return {
        makeParents: enableMakeParents,
        onCreate: setOnCreate,
        delimiter: setDelimiter,
        do: doFunc
    };
}

export function evaluatePath(node, path, options = {}) {
    return traversePath(node, path)
        .delimiter(options.delimiter)
        .do();
}

export function ensureContainerPath(node, containerPath, readInfo = false, parentDir = null) {
    return traversePath(node, containerPath)
        .makeParents()
        .onCreate((node, ctx) => {
            if (readInfo) {
                const infoPath = path.join(parentDir, ctx.path, '.info.yml');
                if (fs.existsSync(infoPath)) {
                    Object.assign(node.info, yaml.load(readFileSync(infoPath)));
                }
            }
        })
        .do();
}
    
function _traverse(nodes, callback, state) {
    for (const [name, node] of nodes) {
        if (state.path !== undefined) {
            state.path = path.join(state.path, name);
        }

        if (state.depth !== undefined) {
            state.depth += 1;
        }

        const result = callback(node, name, state);

        if (result === false) {
            return false;
        }

        if (node.children) {
            if (_traverse(node.children, callback, { ...state }) === false) {
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
        return _traverse(node.children, callback, { ...initialState });
    }

    addState('path', '');
    addState('depth', 0);

    return {
        state: addState,
        do: doFunc
    };
}