import core from '@actions/core';
import { NOTICE, TRACE, WARNING } from '../core/verbosities.js';
import logger from '../core/logger.js';

/**
 * Creates a logger implementation that delegates to the GitHub Actions Core toolkit.
 */

export default function(options) {
    const { colors, verbosity } = options;

    function message(msg, indent, verbosity) {
        let func = core.info;

        if(verbosity === NOTICE) {
            func = core.warning;
        }

        if(verbosity === WARNING) {
            msg = colors.bold.yellow('!!!') + ' ' + msg;
        }

        if(verbosity === TRACE) {
            msg = colors.gray(msg);
        }

        msg = '  '.repeat(indent) + msg;

        func(msg);
    }

    return logger({
        startGroup: core.startGroup,
        endGroup: core.endGroup,
        message
    }, verbosity);
}