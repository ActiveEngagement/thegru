export default function(fetch, options) {
    const baseEndpoint = options.endpoint || 'https://api.getguru.com/api/v1/';

    function endpoint(path = null) {
        if(!path) return baseEndpoint;

        return new URL(path, baseEndpoint).href;
    }

    async function cardsForBoard(boardId, options) {
        const query = new URLSearchParams({
            lite: true
        });

        return await fetch('GET', endpoint(`boards/${boardId}?${query}`), options);
    };

    async function createCard(options) {
        return await fetch('POST', endpoint('cards/extended'), options);
    };

    async function updateCard(id, options) {
        return await fetch('PUT', endpoint(`cards/${id}/extended`), options);
    }

    async function searchCards(options) {
        return await fetch('POST', endpoint(`search/cards`), options);
    }

    async function uploadAttachment(fileName, blob, options) {
        const formData = new FormData();
        formData.append('file', blob, fileName);

        options.data = options.data || formData;

        return await fetch('POST', endpoint(`attachments/upload`), options);
    }

    return {
        cardsForBoard,
        createCard,
        updateCard,
        searchCards,
        uploadAttachment
    };
}