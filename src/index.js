import core from '@actions/core';
import github from '@actions/github';
import nodeFetch from 'node-fetch';
import c from 'ansi-colors';
import { readFile } from './fs_util.js';
import { wrapResponse } from './api_util.js';
import getInputs from './inputs.js';
import createClient from './api_client.js';
import commitCardsFile from './commit_cards_file.js';
import action from './action.js';
import version from './version.cjs';
import { performance } from 'perf_hooks';
import { isRepoPublic } from './util.js';
import getChangedFiles from './file_changes.js';

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

            warning(message) {
                core.warning(message);
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

        logger.info(`Here we go! ${c.yellow(`theguru v${version}`)} is ready for takeoff!`);
        logger.debug(`Inputs: ${JSON.stringify(inputs)}`);

        async function fetch(method, url, options = {}) {
            options.method = options.method || method;
            logger.debug(`Sending HTTP request to ${url} with options: ${JSON.stringify(options)}`);

            const response = wrapResponse(await nodeFetch(url, options));

            logger.debug(`Received response from ${url}: ${await response.text()}`);

            return response;
        }

        const repositoryName = github.context?.payload?.repository?.full_name;
        const repositoryUrl = `${github.context.serverUrl}/${repositoryName}`;
        const sha = github.context.sha;
        const isPublic = await isRepoPublic(repositoryUrl);
        const defaultCardFooter = await readFile(new URL('resources/default_card_footer.md', import.meta.url));
        const client = createClient(fetch);

        let didFileChange = () => true;

        if (inputs.github) {
            const commitMessage = inputs.github.event.head_commit?.message;
            if (commitMessage) {
                if(commitMessage.includes('[guru update]')) {
                    logger.info(c.blue('Since [guru update] was included in the commit, all cards will be updated.'));
                }
                else {
                    const changedFiles = await getChangedFiles({ github: inputs.github, logger });
                    if(changedFiles === null) {
                        logger.warning('We were unable to determine which Markdown files have changed due to a Git error. Most likely, you forgot to include `fetch-depth: 0` in your checkout action. All cards will be updated.')
                    } else {
                        didFileChange = (filePath) => changedFiles.includes(filePath);
                    }
                }
            } else {
                logger.warning('We were unable to read the latest commit message. Any commit flags will be ignored.');
            }
        }
        else {
            logger.warning('Since the "github" option was not set, we are unable to determine which Markdown files have changed. All cards will be updated.');
        }

        logger.info('');

        await action({
            ...inputs,
            defaultCardFooter,
            client,
            logger,
            commitCardsFile,
            github: {
                repositoryName,
                repositoryUrl,
                sha,
                isPublic
            },
            didFileChange
        });

        const elapsed = ((performance.now() - start) / 1000).toFixed(2);
        logger.info(`\nAll done in ${c.green(`${elapsed} seconds`)}!`);
    }
    catch (error) {
        core.info('A fatal exception ocurred!');
        core.debug('Error:');
        core.debug(error);

        core.setFailed(error);
    }
}

main();