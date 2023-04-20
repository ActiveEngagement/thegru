import { TheGuruError } from './error.js';
import createApi from './api.js';
import standardAction from './standard/action.js';
import syncedAction from './synced/action.js';

/**
 * This is the entrypoint for most of the action logic. It is intentionally abstracted away from GitHub Actions and
 * should be executable even in a test environment.
 * 
 * This function will determine whether we are working with a standard or synced collection and delegate to the
 * appropriate action routine.
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
        getChangedFiles,
        setOutput
    } = options;

    // Determine the attachment handler.
    let attachmentHandler = inputs.attachmentHandler;
    if(attachmentHandler === 'auto') {
        attachmentHandler = github.repo.isPublic ? 'github_urls' : 'upload';
    }

    // Set up the API with the given client.
    const api = createApi(client, {
        logger,
        userEmail: inputs.userEmail,
        userToken: inputs.userToken
    });

    // Query Guru for the given collection id so we can validate its type.
    const collection = await api.getCollection(inputs.collectionId);

    if(!collection) {
        throw new TheGuruError(`Collection with id ${inputs.collectionId} not found!`);
    }

    if(inputs.collectionType === 'standard') {
        if(collection.collectionType !== 'INTERNAL') {
            throw new TheGuruError(`We expected a Standard Collection but the provided collection ${inputs.collectionId} is a Synced Collection!`);
        }

        await standardAction({
            api,
            logger,
            colors,
            inputs,
            github,
            defaultFooter,
            attachmentHandler,
            commitCardsFile,
            getChangedFiles
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
            defaultFooter,
            attachmentHandler,
            setOutput
        });
    }
}