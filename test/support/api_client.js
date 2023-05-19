/**
 * A dummy API client implementation that merely keeps track of requests and returns the given responses.
 * 
 * Each desired API response can be passed as an option (e.g. `createCardResult`, `updateCardResult`, `getCardResult`,
 * etc.). You may pass values directly or callbacks that will be evaluated with the incoming request options.
 */
export default function(clientOptions = {}) {
    const calls = [];

    function getCalls() {
        return calls;
    }

    /**
     * If the provided value is a function, then it will be called with the given arguments, and the result will be
     * returned. Otherwise the provided value itself will be returned.
     */
    function call(callable, ...args) {
        return callable instanceof Function ? callable(...args) : callable;
    }

    //
    // Some response-generation utility functions.
    //

    function response(json) {
        if(json && json.ok !== undefined && json.status !== undefined && json.text !== undefined) {
            // There's already a well-formed response.
            return json;
        }

        return {
            ok: true,

            status: 200,

            text() {
                return JSON.stringify(json);
            }
        };
    }

    function noContentResponse() {
        return {
            ok: true,

            status: 204,

            text() {
                return null;
            }
        };
    }

    function notFoundResponse() {
        return {
            ok: false,

            status: 404,

            text() {
                return null;
            }
        };
    }

    function createCard(options) {
        options.body = JSON.parse(options.body);
        calls.push({
            type: 'createCard',
            options
        });

        return response(call(clientOptions.createCardResult, options) || {
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

        return response(call(clientOptions.updateCardResult, options) || options.body);
    }

    function destroyCard(id, options) {
        calls.push({
            type: 'destroyCard',
            id,
            options
        });

        const result = call(clientOptions.destroyCardResult, options) || noContentResponse();

        if(result === 'not_found') {
            return notFoundResponse();
        }
        else {
            return response(result);
        }
    }

    function getCard(id) {
        calls.push({
            type: 'getCard',
            id
        });
        const result = call(clientOptions.getCardResult, id);

        if(result === 'not_found') {
            return notFoundResponse();
        }
        else {
            return response(result);
        }
    }
    
    function getCollections(options) {
        calls.push({
            type: 'getCollections',
            options
        });
        const result = call(clientOptions.getCollectionsResult);

        return response(result);
    }

    function uploadAttachment(fileName, filePath, options) {
        calls.push({
            type: 'uploadAttachment',
            fileName,
            filePath,
            options
        });

        return response(call(clientOptions.uploadAttachmentResult, fileName, filePath, options));
    }

    function uploadZip(collectionId, fileName, filePath, options) {
        calls.push({
            type: 'uploadZip',
            collectionId,
            fileName,
            filePath,
            options
        });

        return response(call(clientOptions.uploadZipResult, fileName, filePath, options));
    }

    return {
        getCalls,
        createCard,
        updateCard,
        destroyCard,
        getCard,
        getCollections,
        uploadAttachment,
        uploadZip
    };
}