let maxId = -1;
const _types = {};

export const BOARD_GROUP = createType('board_group', 1);
export const BOARD = createType('board', 2);
export const BOARD_SECTION = createType('board_section', 3);

function createType(name, level) {
    const id = (++maxId).toString();
    _types[id] = { name, level };

    return id;
}

export function types(callback = null) {
    return Object.keys(_types).map(callback || (t => t));
}

export function level(type) {
    return _types[type].level;
}

export function supportedDepth(type) {
    return types().length - level(type);
}

export function name(type) {
    return _types[type].name;
}

export function from(callback, search) {
    return types().find(t => callback(t) === search);
}