import core from '@actions/core';
import action from './action.js';
import getInputs from './inputs.js';

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

        const inputs = getInputs(core.getInput);

        logger.debug(`Inputs: ${JSON.stringify(inputs)}`);

        await action({ ...inputs, logger });
    } catch (error) {
        core.setFailed(error);
        logger.debug(error.stack);
    }
}

main();