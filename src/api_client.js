import { FormData } from 'node-fetch';

export default function(fetch, options = {}) {
    const baseEndpoint = options.endpoint || 'https://api.getguru.com/api/v1/';

    function endpoint(path = null) {
        if(!path) return baseEndpoint;

        return new URL(path, baseEndpoint).href;
    }

    async function createCard(options) {
        return await fetch('POST', endpoint('cards/extended'), options);
    }

    async function updateCard(id, options) {
        return await fetch('PUT', endpoint(`cards/${id}/extended`), options);
    }

    async function destroyCard(id, options) {
        return await fetch('DELETE', endpoint(`cards/${id}`), options);
    }

    async function getCard(id, options) {
        return await fetch('GET', endpoint(`cards/${id}`), options);
    }

    async function uploadAttachment(fileName, blob, options) {
        const formData = new FormData();
        formData.append('file', blob, fileName);

        options.body = options.body || formData;

        return await fetch('POST', endpoint('attachments/upload'), options);
    }

    return {
        createCard,
        updateCard,
        destroyCard,
        getCard,
        uploadAttachment
    };
}