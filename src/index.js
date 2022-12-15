import core from '@actions/core';
import action from './action.js';
import inputs from './inputs.js';

async function main() {
    try {
        const logger = {
            debug(message) {
                if (this.isDebug()) {
                    core.debug(message);
                }
            },

            isDebug() {
                return core.isDebug();
            }
        };

        await action({
            ...inputs(),
            logger
        });
    } catch (error) {
        core.setFailed(error);
        logger.debug(error.stack);
    }
}

main();