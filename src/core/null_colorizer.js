import c from 'ansi-colors';

/**
 * Creates a Proxy that responds to all methods to which the ansi-colors object would normally respond, but simply
 * returns the input without colorizing it.
 */
export default function() {
    return new Proxy(c, {
        get(target, name) {
            if(name in target && typeof target[name] === 'function') {
                return v => v;
            }
        }
    });
}