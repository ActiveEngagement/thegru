import core from '@actions/core';
import github from '@actions/github';
import nodeFetch from 'node-fetch';
import { readFile } from './fs_util.js';
import { wrapResponse } from './api_util.js';
import getInputs from './inputs.js';
import createClient from './api_client.js';
import commitCardsFile from './commit_cards_file.js';
import action from './action.js';
import { version } from './package.json';
import { performance } from 'perf_hooks';

async function main() {
    try {
        const start = performance.now();
        const inputs = getInputs(core.getInput);

        const logger = {
            debug(message) {
                if(this.isDebug()) {
                    core.debug(message);
                }
            },

            info(message) {
                core.info(message);
            },

            startGroup(name) {
                core.startGroup(name);
            },

            endGroup() {
                core.endGroup();
            },

            isDebug() {
                return core.isDebug() || inputs.debugLogging;
            }
        };

        logger.info(`Here we go! theguru v${version} is ready for takeoff!`);
        logger.debug(`Inputs: ${JSON.stringify(inputs)}`);

        async function fetch(method, url, options = {}) {
            options.method = options.method || method;
            logger.debug(`Sending HTTP request to ${url} with options: ${JSON.stringify(options)}`);

            const response = wrapResponse(await nodeFetch(url, options));

            logger.debug(`Received response from ${url}: ${await response.text()}`);

            return response;
        }

        const repo = github.context?.payload?.repository?.full_name;
        const defaultCardFooter = await readFile(new URL('resources/default_card_footer.md', import.meta.url));
        const client = createClient(fetch);

        await action({
            ...inputs,
            repositoryUrl: `${github.context.serverUrl}/${repo}`,
            defaultCardFooter,
            client,
            logger,
            commitCardsFile,
        });

        const elapsed = ((performance.now() - start) / 1000).toFixed(2);
        logger.info(`All done in ${elapsed} seconds!`);
    }
    catch (error) {
        core.info('A fatal exception ocurred!');
        core.debug('Error:');
        core.debug(error);

        core.setFailed(error);
    }
}

main();