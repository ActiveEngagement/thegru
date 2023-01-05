export default function(clientOptions = {}) {
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

    function createCard(options) {
        options.body = JSON.parse(options.body);
        calls.push({
            type: 'createCard',
            options
        });

        return response(clientOptions.createCardResult || {
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

        if(clientOptions.getCardResult === null) {
            return {
                ok: false,

                status: 404,

                text() {
                    return null;
                }
            };
        }
        else {
            return response(clientOptions.getCardResult);
        }
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
        createCard,
        updateCard,
        getCard,
        uploadAttachment
    };
}