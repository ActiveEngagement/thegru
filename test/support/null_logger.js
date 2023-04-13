import logger from '../../src/core/logger.js';
import { SILENT } from '../../src/core/verbosities.js';

export default function() {
    return logger({
        startGroup() {},
        endGroup() {}
    }, SILENT);
}