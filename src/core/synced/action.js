import fs from 'fs';
import path from 'path';
import generate from './generate_collection.js';
import write from './write_collection.js';

export default async function(options) {
    const {
        api,
        logger,
        inputs,
        github,
        footer,
        attachmentHandler
    } = options;

    const collection = await generate({
        logger,
        inputs,
        github,
        footer,
        attachmentHandler
    });

    logger.debug('Generated collection:\n');
    logger.debug(JSON.stringify(collection, undefined, 4));

    const zipPath = await write(collection, { logger });
    
    const result = await api.uploadZip(inputs.collectionId, path.basename(zipPath), zipPath);
}