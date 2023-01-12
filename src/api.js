import { TheGuruError, FetchError, fetchErrorForResponse } from './error.js';

export default function(client, options) {
    const logger = options.logger;

    function baseHeaders() {
        return {
            accept: 'application/json',
            'content-type': 'application/json',
            authorization: 'Basic ' + auth()
        };
    };

    function base64(input) {
        return Buffer.from(input, 'utf8').toString('base64');
    }

    function auth() {
        return base64(`${options.userEmail}:${options.userToken}`);
    }

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

    async function validate(response) {
        const text = await response.text();

        if(!response.ok) {
            throw fetchErrorForResponse(response, jsonOrText(text));
        }
        else if(text === null) {
            throw new FetchError('Server responded with an invalid response');
        }
        else {
            try {
                return JSON.parse(text);
            }
            catch {
                throw new FetchError('Server responded with an invalid response');
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
        logger.debug(`Updating card with options ${JSON.stringify(options)}`);

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

    async function uploadAttachment(fileName, blob) {
        logger.debug(`Uploading attachment with name ${fileName}`);

        const response = await client.uploadAttachment(fileName, blob, {
            headers: headers({ 'content-type': false })
        });

        return await validate(response);
    }

    return {
        createCard,
        updateCard,
        destroyCard,
        getCard,
        uploadAttachment
    };
}