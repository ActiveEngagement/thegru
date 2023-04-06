import path from 'path';
import generate from './generate_collection.js';
import write from './write_collection.js';

/**
 * This is the entrypoint for most of the synced-collection-based action logic. It is intentionally abstracted away
 * from GitHub Actions and should be executable even in a test environment.
 */

export default async function(options) {
    const {
        api,
        logger,
        inputs,
        github,
        defaultFooter,
        attachmentHandler,
        setOutput
    } = options;

    // Determine the card footer.
    let footer = inputs.cardFooter;
    if(footer === true) {
        logger.info('Using default card footer...');
        footer = defaultFooter;
    }

    // Generate an object representing the built collection.
    // This step is separate so that it is easily testable without constant zipping, unzipping, and working with the API.
    const collection = await generate({
        logger,
        inputs,
        github,
        footer,
        attachmentHandler
    });

    logger.debug('Generated collection:\n');
    logger.debug(JSON.stringify(collection, undefined, 4));

    // Write the collection to a temporary zip file and output its path.
    const zipPath = await write(collection, { logger });
    setOutput('zip', zipPath);
    
    // Upload the zip to Guru.
    const result = await api.uploadZip(inputs.collectionId, path.basename(zipPath), zipPath);

    logger.info(JSON.stringify(result));
}