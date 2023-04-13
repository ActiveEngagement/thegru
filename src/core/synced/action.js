import path from 'path';
import generate from './generate_collection.js';
import write from './write_collection.js';
import { TheGuruError } from '../error.js';

/**
 * This is the entrypoint for most of the synced-collection-based action logic. It is intentionally abstracted away
 * from GitHub Actions and should be executable even in a test environment.
 */

export default async function(options) {
    const {
        api,
        logger,
        colors,
        inputs,
        github,
        defaultFooter,
        attachmentHandler,
        setOutput
    } = options;

    // Determine the card footer.
    let footer = inputs.cardFooter;
    if(footer === true) {
        logger.debug('Using default card footer...');
        footer = defaultFooter;
    }

    logger.debug('Generating collection...');

    // Generate an object representing the built collection.
    // This step is separate so that it is easily testable without constant zipping, unzipping, and working with the API.
    const collection = await generate({
        logger,
        colors,
        inputs,
        github,
        footer,
        attachmentHandler
    });

    logger.debug('Generated collection:\n');
    logger.debug(JSON.stringify(collection, undefined, 4));

    // Write the collection to a temporary zip file and output its path.
    const zipPath = await write(collection, { logger });
    logger.info(`Zipped the collection to "${zipPath}"`);
    setOutput('zip', zipPath);
    
    // Upload the zip to Guru.
    logger.info('Sending collection to Guru...');
    const result = await api.uploadZip(inputs.collectionId, path.basename(zipPath), zipPath);

    if(result.jobId) {
        logger.info(`Collection ${colors.green('uploaded')} successfully, job id ${colors.bold(result.jobId)}`);
    } else {
        throw new TheGuruError('Sync failed with response: ' + JSON.stringify(result));
    }
}