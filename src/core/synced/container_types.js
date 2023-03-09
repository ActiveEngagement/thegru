export const BOARD_GROUP = 0;
export const BOARD = 1;
export const BOARD_SECTION = 2;

const _types = {
    0: {
        slug: 'board_group',
        level: 1
    },
    1: {
        slug: 'board',
        level: 2
    },
    2: {
        slug: 'board_section',
        level: 3
    }
};

export function types() {
    return Object.keys(types);
}

export function level(type) {
    return _types[type].level;
}

export function supportedDepth(type) {
    return types().length - level(type) - 1;
}

export function name(type) {
    return _types[type].slug;
}

export function from(callback, search) {
    return types().find(t => callback(t) === search);
}