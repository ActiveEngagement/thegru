export function pick(obj, ...keys) {
    return Object.fromEntries(
        keys
            .flatMap(e => {
                if(typeof e === 'string') {
                    return e in obj ? [[e, obj[e]]] : [];
                }
                else {
                    return Object.entries(e).map(([key, val]) => [key, obj[val]]);
                }
            })
    );
}
