import core from '@actions/core';

/**
 * Creates a logger implementation that delegates to the GitHub Actions Core toolkit.
 */

export default function(options) {
    const { inputs } = options;

    function isDebug() {
        return core.isDebug() || inputs.debugLogging;
    }

    function debug(message) {
        if(isDebug()) {
            core.debug(message);
        }
    }

    const instance = { isDebug, debug };

    ['info', 'warning', 'startGroup', 'endGroup'].forEach((name) => {
        // Delegate each of these to GitHub actions.
        instance[name] = function(message) {
            core[name](message);
        };
    });

    return instance;
}