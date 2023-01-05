import core from '@actions/core';
import github from '@actions/github';
import nodeFetch from 'node-fetch';
import action from './action.js';
import { readFile } from './fs_util.js';
import getInputs from './inputs.js';
import createClient from './api_client.js';
import wrapResponse from './wrap_response.js';
import commitWorkflow from './commit_workflow.js';

async function main() {
    try {
        const inputs = getInputs(core.getInput);

        const logger = {
            debug(message) {
                if(this.isDebug()) {
                    core.debug(message);
                }
            },

            isDebug() {
                return core.isDebug() || inputs.debugLogging;
            }
        };

        logger.debug(`Inputs: ${JSON.stringify(inputs)}`);

        async function fetch(method, url, options = {}) {
            options.method = options.method || method;
            logger.debug(`Sending HTTP request to ${url} with options: ${JSON.stringify(options)}`);

            const response = wrapResponse(await nodeFetch(url, options));

            logger.debug(`Received response from ${url}: ${await response.text()}`);

            return response;
        }


        const defaultCardFooter = await readFile(new URL('resources/default_card_footer.md', import.meta.url));
        const repo = github.context?.payload?.repository?.full_name;

        const client = createClient(fetch);

        await action({
            ...inputs,
            client,
            commitWorkflow,
            logger,
            repositoryUrl: `${github.context.serverUrl}/${repo}`,
            defaultCardFooter,
            workflowFile: `.github/workflows/${inputs.workflowFile}`,
            jobName: github.context.job
        });
    }
    catch (error) {
        core.setFailed(error);
        core.debug(error);
    }
}

main();