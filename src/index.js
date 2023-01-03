import core from '@actions/core';
import github from '@actions/github';
import nodeFetch from 'node-fetch';
import action from './action.js';
import { readFile } from './fs_util.js';
import getInputs from './inputs.js';
import createApi from './api.js';

async function main() {
    try {
        const logger = {
            debug(message) {
                if(this.isDebug()) {
                    core.debug(message);
                }
            },

            isDebug() {
                return core.isDebug();
            }
        };

        async function fetch(method, url, options = {}) {
            options.method = options.method || method;
            logger.debug(`Sending HTTP request to ${url} with options: ${JSON.stringify(options)}`);

            const response = await nodeFetch(url, options);

            if(logger.isDebug()) {
                logger.debug(`Received response from ${url}: ${await response.clone().text()}`);
            }

            return response;
        }

        const inputs = getInputs(core.getInput);

        const api = createApi(fetch, {
            endpoint: inputs.guruEndpoint,
            userEmail: inputs.userEmail,
            userToken: inputs.userToken,
            logger
        });

        const defaultCardFooter = await readFile('resources/default_card_footer.md');

        logger.debug(`Inputs: ${JSON.stringify(inputs)}`);

        await action({
            ...inputs,
            api,
            logger,
            repositoryUrl: `${github.context.server_url}/${github.context.repository}`,
            defaultCardFooter
        });
    }
    catch (error) {
        core.setFailed(error);
        logger.debug(error.stack);
    }
}

main();