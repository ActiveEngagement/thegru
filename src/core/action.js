import { TheGuruError } from './error.js';
import createApi from './api.js';
import standardAction from './standard/action.js';
import syncedAction from './synced/action.js';

/**
 * This is the entrypoint for most of the action logic. It is intentionally abstracted away from GitHub Actions and
 * should be executable even in a test environment.
 */

export default async function(options) {
    const {
        client,
        logger,
        colors,
        inputs,
        github,
        defaultFooter,
        commitCardsFile,
        getChangedFiles
    } = options;

    // Determine the attachment handler.
    let attachmentHandler = inputs.attachmentHandler;
    if(attachmentHandler === 'auto') {
        attachmentHandler = github.repo.isPublic ? 'github_urls' : 'upload';
    }

    // Determine the card footer.
    let footer = inputs.cardFooter;
    if(footer === undefined || footer === null || footer === true) {
        logger.info('Using default card footer...');
        footer = defaultFooter;
    }

    // Set up the API with the given client.
    const api = createApi(client, {
        logger,
        userEmail: inputs.userEmail,
        userToken: inputs.userToken
    });

    // Query Guru for the given collection id so we can validate its type.
    const collection = api.getCollection(inputs.collectionId);

    if(!collection) {
        throw new TheGuruError(`Collection with id ${inputs.collectionId} not found!`);
    }

    if(inputs.collectionType === 'standard') {
        if(collection.collectionType === 'EXTERNAL') {
            throw new TheGuruError(`We expected a Standard Collection but the provided collection ${inputs.collectionId} is a Synced Collection!`);
        }

        await standardAction({
            api,
            logger,
            colors,
            inputs,
            github,
            footer,
            commitCardsFile,
            getChangedFiles,
            attachmentHandler
        });
    }
    else {
        if(collection.collectionType !== 'EXTERNAL') {
            throw new TheGuruError(`We expected a Synced Collection but the provided collection ${inputs.collectionId} is a Standard Collection!`);
        }

        await syncedAction({
            api,
            logger,
            colors,
            inputs,
            github,
            footer,
            attachmentHandler
        });
    }
}