/**
 * Attempts to execute a closure. Specific exception types may be caught by class.
 * 
 * The motivation for this function is the JavaScript try statement's inability to catch specific exceptions.
 */

export default function() {
    const catchers = [];

    function catchFunc(klass, callback) {
        catchers.push({ klass, callback });

        return this;
    }

    function catchAll(callback) {
        return this.catch(null, callback);
    }

    async function doFunc(callback) {
        try {
            return await callback();
        }
        catch (e) {
            for(const catcher of catchers) {
                if(catcher.klass === null || e instanceof catcher.klass) {
                    return await catcher.callback(e);
                }
            }

            throw e;
        }
    }

    function doSync(callback) {
        try {
            return callback();
        }
        catch (e) {
            for(const catcher of catchers) {
                if(catcher.klass === null || e instanceof catcher.klass) {
                    return catcher.callback(e);
                }
            }

            throw e;
        }
    }

    return { catch: catchFunc, catchAll, do: doFunc, doSync };
}