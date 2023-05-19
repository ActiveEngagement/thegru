import logger from '../../src/core/logger.js';
import { SILENT } from '../../src/core/verbosities.js';

/**
 * A dummy logger implementation that does absolutely nothing.
 */
export default function() {
    return logger({
        startGroup() {},
        endGroup() {}
    }, SILENT);
}