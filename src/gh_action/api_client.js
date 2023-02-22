import { blobFromSync, FormData } from 'node-fetch';

/**
 * An API client implementation that wraps a fetch function.
 */

export default function(fetch, options = {}) {
    const { endpoint: endpointOption } = options;
    const baseEndpoint = endpointOption || 'https://api.getguru.com/api/v1/';

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

    async function getCollection(id, options) {
        return await fetch('GET', endpoint(`collections/${id}`), options);
    }

    async function uploadAttachment(fileName, filePath, options) {
        // Hydrate a FormData instance with the blob.
        const formData = new FormData();
        formData.append('file', blobFromSync(filePath), fileName);

        options.body = options.body || formData;

        return await fetch('POST', endpoint('attachments/upload'), options);
    }

    return {
        createCard,
        updateCard,
        destroyCard,
        getCard,
        getCollection,
        uploadAttachment
    };
}