import logger from '../../src/core/logger.js';
import { TRACE } from '../../src/core/verbosities.js';

/**
 * A dummy logger implementation that merely collects log messages in an array for inspection.
 */
export default function() {
    const messages = [];

    const instance = logger({
        startGroup(name) {
            messages.push('===' + name + '===');
        },
        endGroup() {
            messages.push('=========');
        },
        message(msg) {
            messages.push(msg);
        }
    }, TRACE);

    instance.getMessages = function() {
        return messages;
    };

    return instance;
}