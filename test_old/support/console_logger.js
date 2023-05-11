import logger from '../../src/core/logger.js';
import { TRACE, name } from '../../src/core/verbosities.js';

export default function() {
    return logger({
        startGroup(name) {
            console.log('===' + name + '===');
        },
        endGroup() {
            console.log('=========');
        },
        message(msg, indent, verbosity) {
            console.log(`[${name(verbosity).toUpperCase()}]  ` + msg);
        }
    }, TRACE);
}