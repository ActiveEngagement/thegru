export default function(clientOptions = {}) {
    const calls = [];

    function call(callable, ...args) {
        return callable instanceof Function ? callable(...args) : callable;
    }

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

        return response(options);
    }

    function destroyCard(id, options) {
        calls.push({
            type: 'destroyCard',
            id,
            options
        });

        return noContentResponse();
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
    
    function getCollection(id, options) {
        calls.push({
            type: 'getCollection',
            id,
            options
        });
        const result = call(clientOptions.getCollectionResult, id);

        if(result === 'not_found') {
            return notFoundResponse();
        }
        else {
            return response(result);
        }
    }

    function uploadAttachment(fileName, filePath, options) {
        calls.push({
            type: 'uploadAttachment',
            fileName,
            filePath,
            options
        });

        return response(call(clientOptions.attachmentResult, fileName, filePath, options));
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
        getCollection,
        uploadAttachment,
        uploadZip
    };
}