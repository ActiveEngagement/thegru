import createApiBase from '../../../src/core/api.js';
import { FetchError } from '../../../src/core/error';
import createClient from '../../support/api_client.js';
import nullLogger from '../../support/null_logger.js';

function createApi(client, options = {}) {
    options.logger ||= nullLogger();

    return createApiBase(client, options);
}

function response(text) {
    return {
        ok: true,

        status: 200,

        text() {
            return text;
        }
    };
}

function error(status, text = null) {
    return {
        ok: false,

        status,
        
        text() {
            return text;
        }
    };
}

describe('core/api.js', () => {
    describe.each([
        ['createCard', [{}]],
        ['updateCard', ['123', {}]],
        ['destroyCard', ['123', {}]],
        ['getCard', ['123']],
        ['getCollections', []],
        ['uploadAttachment', [null, null]],
        ['uploadZip', ['c123', null, null]]
    ])('the standard functions', (functionName, functionArgs = []) => {
        describe.each([
            [response('"invalid"')], // a JSON string is invalid even though it's valid JSON
            [response('invalid')],
            [response('')],
        ])('with invalid API responses', (response) => {
            it('throws an appropriate error', () => {
                const client = createClient({
                    [functionName + 'Result']: response
                });
                const api = createApi(client);
                const f = async() => await api[functionName](...functionArgs);
                expect(f).rejects.toThrow(FetchError);
                expect(f).rejects.toThrow('Server responded with an invalid response');
            });
        });

        describe.each([
            [error(403), 'Server responded with a 403 status code'],
            [error(403, 'invalid'), 'Server responded with a 403 status code'],
            [error(500, JSON.stringify({ description: 'Bad!'})), 'Server responded with a 500 status code: Bad!'],
        ])('with non-success code', (response, expectedMessage) => {
            it('throws an appropriate error', () => {
                const client = createClient({
                    [functionName + 'Result']: response
                });
                const api = createApi(client);
                const f = async() => await api[functionName](...functionArgs);
                expect(f).rejects.toThrow(FetchError);
                expect(f).rejects.toThrow(expectedMessage);
            });
        });
    });
});