import { FetchError, fetchErrorForResponse } from './error.js';
import { base64 } from './util.js';

/**
 * Wraps an API client to make it a bit nicer to work with.
 */

export default function(client, options) {
    const { logger, userEmail, userToken } = options;

    function auth() {
        return base64(`${userEmail}:${userToken}`);
    }

    function baseHeaders() {
        return {
            accept: 'application/json',
            'content-type': 'application/json',
            authorization: 'Basic ' + auth()
        };
    };

    /**
     * Merges the given headers with the defaults. A default header may be avoided by setting it to `false`.
     */

    function headers(headers = {}) {
        const result = baseHeaders();

        for(const [key, value] of Object.entries(headers)) {
            if(value === false) {
                delete result[key];
            }
            else {
                result[key] = value;
            }
        }

        return result;
    }

    function jsonOrText(input) {
        try {
            return JSON.parse(input);
        }
        catch {
            return input;
        }
    }

    /**
     * Analyzes an API response. If the response succeeded, then it's content (or null) is returned. If it failed,
     * an appropriate exception is thrown.
     */

    async function validate(response) {
        const text = await response.text();

        if(!response.ok) {
            throw fetchErrorForResponse(response, jsonOrText(text));
        }
        else if(text === null) {
            return null;
        }
        else {
            try {
                return JSON.parse(text);
            }
            catch {
                throw new FetchError('Server responded with an invalid response', response);
            }
        }
    }

    async function createCard(options) {
        logger.debug(`Creating card with options ${JSON.stringify(options)}`);

        const { title, collectionId, boardId, sectionId, ...params } = options;

        const boards = [];

        if(boardId) {
            const board = { id: boardId };
            if(sectionId) {
                board.action = {
                    actionType: 'add',
                    prevSiblingItem: sectionId,
                    sectionId
                };
            }
            boards.push(board);
        }

        const response = await client.createCard({
            headers: headers(),
            body: JSON.stringify({
                preferredPhrase: title,
                shareStatus: 'TEAM',
                collection: { id: collectionId },
                boards,
                ...params
            })
        });

        return await validate(response);
    };

    async function updateCard(id, options) {
        logger.debug(`Updating card with id ${id} with options ${JSON.stringify(options)}`);

        options.preferredPhrase = options.title;
        delete options.title;

        const response = await client.updateCard(id, {
            headers: headers(),
            body: JSON.stringify(options),
        });

        return await validate(response);
    }

    async function destroyCard(id) {
        logger.debug(`Destroying card with id ${id}`);

        const response = await client.destroyCard(id, {
            headers: headers()
        });

        if(response.status === 404) {
            return false;
        }

        return await validate(response);
    }

    async function getCard(id) {
        logger.debug(`Getting card with id ${id}`);

        const response = await client.getCard(id, {
            headers: headers()
        });

        if(response.status === 404) {
            return null;
        }

        return await validate(response);
    }

    async function getCollections() {
        logger.debug('Getting all collections');

        const response = await client.getCollections({
            headers: headers()
        });

        return await validate(response);
    }

    async function getCollection(id) {
        logger.debug(`Getting collection with id ${id}`);

        const response = await client.getCollection(id, {
            headers: headers()
        });

        if(response.status === 404) {
            return null;
        }

        return await validate(response);
    }

    async function uploadAttachment(fileName, filePath) {
        logger.debug(`Uploading attachment with name ${fileName}`);

        const response = await client.uploadAttachment(fileName, filePath, {
            headers: headers({ 'content-type': false })
        });

        return await validate(response);
    }

    async function uploadZip(collectionId, fileName, filePath) {
        logger.debug(`Uploading zip with name ${fileName} at ${filePath} to collection ${collectionId}`);

        const response = await client.uploadZip(collectionId, fileName, filePath, {
            headers: headers({ 'content-type': false })
        });

        return await validate(response);
    }

    return {
        createCard,
        updateCard,
        destroyCard,
        getCard,
        getCollection,
        getCollections,
        uploadAttachment,
        uploadZip
    };
}