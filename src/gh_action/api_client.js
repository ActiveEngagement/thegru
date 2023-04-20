import { blobFromSync, FormData } from 'node-fetch';

/**
 * An API client implementation that wraps a fetch function.
 */

export default function(fetch, options = {}) {
    const { endpoint: endpointOption } = options;
    const baseEndpoint = endpointOption || 'https://api.getguru.com/';
    const baseApiEndpoint = baseEndpoint + 'api/v1/';
    const baseAppEndpoint = baseEndpoint + 'app/';

    function endpoint(base, path = null) {
        if(!path) return base;

        return new URL(path, base).href;
    }

    function apiEndpoint(path = null) {
        return endpoint(baseApiEndpoint, path);
    }

    function appEndpoint(path = null) {
        return endpoint(baseAppEndpoint, path);
    }

    async function createCard(options) {
        return await fetch('POST', apiEndpoint('cards/extended'), options);
    }

    async function updateCard(id, options) {
        return await fetch('PUT', apiEndpoint(`cards/${id}/extended`), options);
    }

    async function destroyCard(id, options) {
        return await fetch('DELETE', apiEndpoint(`cards/${id}`), options);
    }

    async function getCard(id, options) {
        return await fetch('GET', apiEndpoint(`cards/${id}`), options);
    }

    async function getCollection(id, options) {
        return await fetch('GET', apiEndpoint(`collections/${id}`), options);
    }

    async function getCollections(options) {
        return await fetch('GET', apiEndpoint('collections'), options);
    }

    async function uploadAttachment(fileName, filePath, options) {
        // Hydrate a FormData instance with the blob.
        const formData = new FormData();
        formData.append('file', blobFromSync(filePath), fileName);

        options.body = options.body || formData;

        return await fetch('POST', apiEndpoint('attachments/upload'), options);
    }

    async function uploadZip(collectionId, fileName, filePath, options) {
        // Hydrate a FormData instance with the blob.
        const formData = new FormData();
        formData.append('file', blobFromSync(filePath), fileName);
        options.body ||= formData;

        return await fetch('POST', appEndpoint('contentsyncupload') + '?collectionId=' + collectionId, options);
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