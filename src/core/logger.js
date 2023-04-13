import { SILENT, level, name, verbosities } from '../core/verbosities.js';

export default function(base, verbosity) {
    let indent = 0;

    function message(msg, v) {
        base.message(msg, indent, v)
    }

    const instance = {
        startGroup(message, v) {
            if(!v || level(v) <= level(verbosity)) {
                base.startGroup(message, verbosity);
            }
        },

        endGroup(v) {
            if(!v || level(v) <= level(verbosity)) {
                base.endGroup(verbosity);
            }
        },

        indent(v) {
            if(!v || level(v) <= level(verbosity)) {
                indent++;
            }
        },

        unindent(v) {
            if(!v || level(v) <= level(verbosity)) {
                indent--;
            }
        },

        verbosity() {
            return verbosity;
        }
    };

    // Register a log method for each verbosity that delegates if it is not less than the current verbosity.
    verbosities().forEach(v => {
        // Obviously there's no method for the SILENT logging level.
        if (v === SILENT) {
            return;
        }

        instance[name(v)] = function(msg) {
            if(level(v) <= level(verbosity)) {
                message(msg, v);
            }
        };
    })

    return instance;
}