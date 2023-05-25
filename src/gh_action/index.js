import { performance } from 'perf_hooks';
import core from '@actions/core';
import c from 'ansi-colors';

import getInputs from '../core/inputs.js';
import action from '../core/action.js';
import { readFile, srcUrl } from '../core/fs_util.js';
import nullColorizer from '../core/null_colorizer.js';
import ghLogger from './gh_logger.js';
import createClient from './api_client.js';
import createFetch from './fetch.js';
import version from './version.cjs';
import isRepoPublic from './gh_repo_public.js';
import commitCardsFile from './commit_cards_file.js';
import * as verbosities from '../core/verbosities.js';
import isFileCommittedBase from './is_file_committed.js';
import getChangedFiles from './changed_files.js';

/**
 * This is the main entry point for the GitHub action. It's SOLE purpose should be to set up dependencies for
 * action.js, which should perform the bulk of the action logic.
 * 
 * In theory, the entire action should be executable just from action.js. Any code in this file should be specific
 * to GitHub Actions.
 */

async function main() {
    try {
        // We need to start this now in order to get an accureate duration.
        const start = performance.now();

        // Acquire the GitHub Actions inputs (specified in the `with:` map).
        const inputs = getInputs(core.getInput, {
            // This second logger is necessary to prevent a circular dependency.
            // We'll set its verbosity to the highest setting, since we won't know the desired verbosity until we've
            // parsed the inputs.
            logger: ghLogger({
                // This null colorizer is necessary to prevent a circular dependency.
                colors: nullColorizer(),
                verbosity: verbosities.TRACE
            })
        });

        // Set up the colorizer to use ansi-colors if ANSI is allowed or a dummy otherwise.
        const colors = inputs.ansi ? c : nullColorizer();

        let verbosity = inputs.verbosity;
        
        // If GitHub Actions is set to "Debug Logging" mode, then we'll raise the verbosity to DEBUG if it isn't already.
        if(core.isDebug() && verbosities.level(verbosity) < verbosities.level(verbosities.DEBUG)) {
            verbosity = verbosities.DEBUG;
        }

        // Set up the logger to delegate to the GitHub Actions Core toolkit.
        const logger = ghLogger({ colors, verbosity });

        // Greet the user.
        logger.info(`Here we go! ${colors.yellow(`theguru v${version}`)} is ready for takeoff!`);
        logger.trace(`Inputs: ${JSON.stringify(inputs)}`);

        // Set up an API client that delegates to node-fetch.
        const client = createClient(createFetch({ logger }));

        // Acquire information about the run from the given GitHub context.
        const ghContext = inputs.github;
        const github = {
            repo: {},
            commit: {},
            event: {}
        };
        github.repo.name = ghContext.repository;
        github.repo.url = `${ghContext.server_url}/${github.repo.name}`;
        github.repo.isPublic = await isRepoPublic(github.repo.url);
        github.commit.sha = ghContext.sha;

        // Retrieve the default card footer from disk.
        const defaultFooter = readFile(srcUrl('resources/default_card_footer.md'));

        const changedFiles = await getChangedFiles({ logger });
        const isFileCommitted = async(file) => {
            if(!await isFileCommittedBase(file, { logger })) {
                return false;
            }
            if(changedFiles === null) {
                // If getChangedFiles() couldn't get a list of changed files, we'll always use "upload".
                return false;
            }
            if(changedFiles.includes(file)) {
                logger.info(`${file} is committed to the repository, so it would normally be a candidate for GitHub URLs. However, since it has uncommitted changes, we'll process it using the "upload" strategy just in case.`);
                return false;
            }

            return true;
        };

        // Run the action with the appropriate dependencies.
        await action({
            client,
            logger,
            colors,
            inputs,
            github,
            defaultFooter,
            commitCardsFile,
            getChangedFiles,
            setOutput: core.setOutput,
            isFileCommitted
        });

        // Bid the user farewell.
        const elapsed = ((performance.now() - start) / 1000).toFixed(2);
        logger.info(`All done in ${colors.green(`${elapsed} seconds`)}!`);
    }
    catch (error) {
        core.info('A fatal exception ocurred!');

        core.debug('Error:');
        core.debug(error);

        core.setFailed(error);
    }
}

main();