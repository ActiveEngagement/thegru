import logger from '../../src/core/logger.js';
import { TRACE, name } from '../../src/core/verbosities.js';

/**
 * A logger implementation for testing purposes that merely writes log messages to the console.
 */
export default function() {
    return logger({
        startGroup(name) {
            console.log('===' + name + '===');
        },
        endGroup() {
            console.log('=========');
        },
        message(msg, _indent, verbosity) {
            console.log(`[${name(verbosity).toUpperCase()}]  ` + msg);
        }
    }, TRACE);
}