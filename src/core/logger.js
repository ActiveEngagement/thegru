import { SILENT, level, name, verbosities } from '../core/verbosities.js';

export default function(base, verbosity) {
    const instance = { };

    // Delegate these directly.
    ['startGroup', 'endGroup'].forEach((name) => {
        instance[name] = function(message) {
            base[name](message);
        };
    });

    // Register a log method for each verbosity that delegates if it is not less than the current verbosity.
    verbosities().forEach(v => {
        // Obviously there's no method for the SILENT logging level.
        if (v === SILENT) {
            return;
        }

        instance[name(v)] = function(message) {
            if(level(v) <= level(verbosity)) {
                base.message(message, v);
            }
        };
    })

    instance.verbosity = () => verbosity;

    return instance;
}