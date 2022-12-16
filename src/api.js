import nodeFetch from 'node-fetch';
import { FormData } from 'formdata-polyfill/esm.min.js';
import { TheGuruError, FetchError } from './error.js';
import { flattenBoardCards } from './api_util.js';

export default function(options) {
    const baseEndpoint = options.endpoint || 'https://api.getguru.com/api/v1/';
    const logger = options.logger || {
        debug() {},

        isDebug() {
            return false;
        }
    };

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

    function endpoint(path = null) {
        if(!path) return baseEndpoint;

        return new URL(path, baseEndpoint).href;
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
            throw new FetchError(response, jsonOrText(text));
        }
        else if(!text || text === '') {
            return null;
        }
        else {
            return jsonOrText(text);
        }
    }

    async function fetch(url, options) {
        logger.debug(`Sending HTTP request to ${url} with options: ${JSON.stringify(options)}`);

        const response = await nodeFetch(url, options);

        if(logger.isDebug()) {
            logger.debug(`Received response from ${url}: ${await response.clone().text()}`);
        }

        return response;
    }

    async function cardsForBoard(boardId) {
        logger.debug(`Getting all cards for board ${boardId}`);

        const query = new URLSearchParams({
            lite: true
        });

        const response = await fetch(endpoint(`boards/${boardId}?${query}`), {
            method: 'GET',
            headers: headers()
        });

        return (await validate(response)).items;
    };

    async function createCard(options = {}) {
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

        const response = await fetch(endpoint('cards/extended'), {
            method: 'POST',
            headers: headers(),
            body: JSON.stringify({
                preferredPhrase: title,
                shareStatus: 'TEAM',
                collection: { id: collectionId },
                boards,
                ...params
            }),
        });

        return await validate(response);
    };

    async function updateCard(id, options = {}) {
        logger.debug(`Updating card with options ${JSON.stringify(options)}`);

        const response = await fetch(endpoint(`cards/${id}/extended`), {
            method: 'PUT',
            headers: headers(),
            body: JSON.stringify(options),
        });

        return await validate(response);
    }

    async function deleteCard(id) {
        logger.debug(`Deleting card ${id}`);

        const response = await fetch(endpoint(`cards/${id}`), {
            method: 'DELETE',
            headers: headers()
        });

        return await validate(response);
    };

    async function createSections(boardId, titles) {
        logger.debug(`Creating ${titles.length} board sections for board ${boardId}`);
        const response = await fetch(endpoint(`boards/${boardId}/entries`), {
            method: 'PUT',
            headers: headers(),
            body: JSON.stringify({
                actionType: 'add',
                boardEntries: titles.map(title => ({
                    entryType: 'section',
                    title
                }))
            })
        });

        return await validate(response);
    };

    async function createSection(boardId, title) {
        return (await createSections(boardId, [title]))[0];
    };

    async function deleteSections(boardId, ids) {
        logger.debug(`Deleting ${ids.length} board sections for board ${boardId}`);
        const response = await fetch(endpoint(`boards/${boardId}/entries`), {
            method: 'PUT',
            headers: headers(),
            body: JSON.stringify({
                actionType: 'remove',
                boardEntries: ids.map(id => ({
                    entryType: 'section',
                    id
                }))
            })
        });

        return await validate(response);
    };

    async function deleteSection(boardId, id) {
        return (await deleteSections(boardId, [id]))[0];
    };

    async function uploadAttachment(fileName, blob) {
        logger.debug(`Uploading attachment with name ${fileName}`);

        const formData = new FormData();
        formData.append('file', blob, fileName);

        const response = await fetch(endpoint(`attachments/upload`), {
            method: 'POST',
            headers: headers({
                'content-type': false
            }),
            body: formData
        });

        return await validate(response);
    }

    async function searchCards(options = {}) {
        logger.debug(`Searching cards with options ${JSON.stringify(options)}`);

        const response = await fetch(endpoint(`search/cards`), {
            method: 'POST',
            headers: headers(),
            body: JSON.stringify(options)
        });

        return (await validate(response)).cards;
    }


    async function getCardWith(title, collectionId, boardId = null, boardSectionId = null) {
        if(boardSectionId && !boardId) {
            throw new TheGuruError('Cannot search for a card by board section and not by board!');
        }

        let cards = [];

        if(boardId) {
            cards = flattenBoardCards(await cardsForBoard(boardId));

            if(boardSectionId) {
                cards = cards.filter(card => card.sectionId === boardSectionId);
            }
        }
        else {
            cards = await searchCards({
                collectionIds: [collectionId],
                queryType: 'search_cards',
                searchTerms: title
            });
            cards = cards.filter(card => !card.boards || card.boards.length === 0);
        }

        return cards.find(card => card.preferredPhrase == title);
    }

    return {
        endpoint,
        auth,
        headers,
        fetch,
        cardsForBoard,
        createCard,
        updateCard,
        deleteCard,
        createSections,
        createSection,
        deleteSections,
        deleteSection,
        uploadAttachment,
        searchCards,
        getCardWith
    };
}