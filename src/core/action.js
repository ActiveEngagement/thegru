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

    // Get all collections from Guru.
    const collections = await api.getCollections();

    // Try to find the given collection id/slug so we can validate its type.
    const id = inputs.collectionId;
    const collection = collections.find(candidate => candidate.id === id || candidate.slug === id);

    if(!collection) {
        throw new TheGuruError(`Collection with id ${id} not found!`);
    }

    if(inputs.collectionType === 'standard') {
        if(collection.collectionType !== 'INTERNAL') {
            throw new TheGuruError(`We expected a Standard Collection but the provided collection ${id} is a Synced Collection!`);
        }

        await standardAction({
            api,
            logger,
            colors,
            inputs,
            github,
            defaultFooter,
            attachmentHandler,
            commitCardsFile
        });
    }
    else {
        if(collection.collectionType !== 'EXTERNAL') {
            throw new TheGuruError(`We expected a Synced Collection but the provided collection ${id} is a Standard Collection!`);
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