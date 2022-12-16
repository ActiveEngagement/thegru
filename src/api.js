import { TheGuruError, FetchError } from './error.js';
import { flattenBoardCards } from './api_util.js';

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
            throw new FetchError(response, jsonOrText(text));
        }
        else if(!text || text === '') {
            return null;
        }
        else {
            return jsonOrText(text);
        }
    }

    async function cardsForBoard(boardId) {
        logger.debug(`Getting all cards for board ${boardId}`);

        const response = await client.cardsForBoard(boardId, {
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

    async function updateCard(id, options = {}) {
        logger.debug(`Updating card with options ${JSON.stringify(options)}`);

        const response = await client.updateCard(id, {
            headers: headers(),
            body: JSON.stringify(options),
        });

        return await validate(response);
    }

    async function searchCards(options = {}) {
        logger.debug(`Searching cards with options ${JSON.stringify(options)}`);

        const response = await client.searchCards({
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
            cards = flattenBoardCards(await cardsForBoard(boardId))
                .filter(card => boardSectionId ? card.sectionId === boardSectionId : !card.sectionId);
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
        cardsForBoard,
        createCard,
        updateCard,
        searchCards,
        getCardWith
    };
}