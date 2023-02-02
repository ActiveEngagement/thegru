/**
 * Attempts to execute a closure. Specific exception types may be caught by class.
 * 
 * The motivation for this function is the JavaScript try statement's inability to catch specific exceptions.
 */

export default function() {
    let toCallback = () => {};
    const catchers = [];

    function to(callback) {
        toCallback = callback;

        return this;
    }

    function catchFunc(klass, callback) {
        catchers.push({ klass, callback });

        return this;
    }

    async function doFunc() {
        try {
            return await toCallback();
        }
        catch (e) {
            for(const catcher of catchers) {
                if(e instanceof catcher.klass) {
                    return await catcher.callback(e);
                }
            }

            throw e;
        }
    }

    return { to, catch: catchFunc, do: doFunc };
}