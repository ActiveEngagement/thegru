export default function(clientOptions) {
    const calls = [];

    function getCalls() {
        return calls;
    }

    function response(json) {
        return {
            ok: true,

            status: 200,

            text() {
                return JSON.stringify(json);
            }
        };
    }

    function cardsForBoard(boardId, options) {
        calls.push({
            type: 'cardsForBoard',
            boardId,
            options
        });

        return response(clientOptions.cardsForBoardResult);
    }

    function createCard(options) {
        options.body = JSON.parse(options.body);
        calls.push({
            type: 'createCard',
            options
        });

        return response({
            id: '123'
        });
    }

    function updateCard(id, options) {
        options.body = JSON.parse(options.body);
        calls.push({
            type: 'updateCard',
            id,
            options
        });

        return response(options);
    }

    function searchCards(options) {
        options.body = JSON.parse(options.body);
        calls.push({
            type: 'searchCards',
            options
        });

        return response(clientOptions.searchResult);
    }

    function uploadAttachment(fileName, blob, options) {
        calls.push({
            type: 'uploadAttachment',
            fileName,
            blob,
            options
        });

        return response(clientOptions.attachmentResult);
    }

    return {
        getCalls,
        cardsForBoard,
        createCard,
        updateCard,
        searchCards,
        uploadAttachment
    };
}