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

    function getCard(id) {
        calls.push({
            type: 'getCard',
            id
        });
        const result = call(clientOptions.getCardResult, id);

        if(result === null) {
            return {
                ok: false,

                status: 404,

                text() {
                    return null;
                }
            };
        }
        else {
            return response(result);
        }
    }

    function uploadAttachment(fileName, blob, options) {
        calls.push({
            type: 'uploadAttachment',
            fileName,
            blob,
            options
        });

        return response(call(clientOptions.attachmentResult, fileName, blob, options));
    }

    return {
        getCalls,
        createCard,
        updateCard,
        getCard,
        uploadAttachment
    };
}