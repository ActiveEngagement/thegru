import runHandleCard from '../src/handle_card.js';
import createApi from '../src/api.js';
import { FetchError } from '../src/error.js';
import createClient from './support/api_client.js';
import { resource } from './support/util.js';
import { pick } from '../src/util.js';
import nullLogger from './support/null_logger.js';

async function handleCard(options) {
    options.logger ||= nullLogger();
    if(options.client) {
        options.api = createApi(options.client, pick(options, 'logger'));
        delete options.client;
    }
    options.existingCardIds ||= [];
    options.github ||= {};
    options.github.repositoryUrl ||= 'https://example.com';
    options.github.repositoryName ||= 'ActiveEngagement/test';
    options.github.sha ||= '1234567890';
    if(options.github.isPublic === undefined) {
        options.github.isPublic = false;
    }
    options.imageHandler ||= 'auto';
    options.didFileChange ||= () => true;

    return await runHandleCard(options);
}

function apiCall(type, body) {
    return {
        type,
        options: {
            body,
            headers: {
                accept: 'application/json',
                authorization: 'Basic dW5kZWZpbmVkOnVuZGVmaW5lZA==',
                'content-type': 'application/json'
            }
        }
    };
}

function createCardApiCall(options) {
    return apiCall('createCard', {
        shareStatus: 'TEAM',
        ...options
    });
}

function updateCardApiCall(options) {
    return apiCall('updateCard', options);
}

describe.each([
    [undefined],
    [{}],
    [{ 'unrelated/path': 'card123', 'also/unrelated': 'card456' }]
])('when the path is not present in the cards file', (existingCardIds) => {
    describe.each([
        [undefined, undefined, []],
        ['board123', undefined, [{ id: 'board123' }]],
        [
            'board123',
            'boardSection123',
            [{
                id: 'board123',
                action: {
                    actionType: 'add',
                    prevSiblingItem: 'boardSection123',
                    sectionId: 'boardSection123'
                }
            }],
        ],
        [undefined, 'boardSection123', []],
    ])('optionally with boardId and boardSectionId', (boardId, boardSectionId, boards) => {
        let client = null;

        beforeEach(async() => {
            client = createClient({ createCardResult: { id: 'newCard123' } });

            await handleCard({
                client,
                filePath: 'test/resources/test_card.md',
                cardTitle: 'Test Card',
                collectionId: 'c123',
                boardId,
                boardSectionId,
                existingCardIds
            });
        });

        it('makes exactly one api request to create the card', async() => {
            expect(client.getCalls().length).toBe(1);
            expect(client.getCalls()[0]).toEqual(createCardApiCall({
                preferredPhrase: 'Test Card',
                collection: { id: 'c123' },
                boards,
                content: await resource('test_card_expected_output.html')
            }));
        });
    });
});


describe.each([
    [undefined, undefined, undefined],
    ['collection123', undefined, undefined],
    ['collection123', 'board123', undefined],
    ['collection123', 'board123', 'boardSection123'],
])('when a card id is present', (collectionId, boardId, boardSectionId) => {
    let client = null;

    beforeEach(async() => {
        client = createClient({ getCardResult: { } });

        await handleCard({
            client,
            filePath: 'test/resources/test_card.md',
            cardTitle: 'Final',
            collectionId,
            boardId,
            boardSectionId,
            existingCardIds: { 'test/resources/test_card.md': 'existing123' }
        });
    });

    it('updates the card', async() => {
        expect(client.getCalls()[1]).toEqual(updateCardApiCall({
            content: await resource('test_card_expected_output.html')
        }));
    });
});

describe.each([
    [undefined, undefined, []],
    ['board123', undefined, [{ id: 'board123' }]],
    [
        'board123',
        'boardSection123',
        [{
            id: 'board123',
            action: {
                actionType: 'add',
                prevSiblingItem: 'boardSection123',
                sectionId: 'boardSection123'
            }
        }],
    ],
    [undefined, 'boardSection123', []],
])('when a nonexistent card id is present', (boardId, boardSectionId, boards) => {
    let client = null;

    beforeEach(async() => {
        client = createClient({
            getCardResult: null,
            createCardResult: { id: 'newCard123' }
        });

        await handleCard({
            client,
            filePath: 'test/resources/test_card.md',
            cardTitle: 'Test Card',
            collectionId: 'c123',
            boardId,
            boardSectionId,
            existingCardIds: {
                'test/resources/test_card.md': '234982093483'
            }
        });
    });

    it('makes an api request to create the card', async() => {
        expect(client.getCalls()[1]).toEqual(createCardApiCall({
            preferredPhrase: 'Test Card',
            collection: { id: 'c123' },
            boards,
            content: await resource('test_card_expected_output.html')
        }));
    });
});

describe('when an archived card id is present', () => {
    let client = null;

    beforeEach(async() => {
        client = createClient({
            getCardResult: { id: 'card123', archived: true },
            createCardResult: { id: 'newCard123' }
        });

        await handleCard({
            client,
            filePath: 'test/resources/test_card.md',
            cardTitle: 'Test Card',
            collectionId: 'c123',
            existingCardIds: { 'test/resources/test_card.md': 'card123' }
        });
    });

    it('makes an api request to create the card', async() => {
        expect(client.getCalls()[1]).toEqual(createCardApiCall({
            preferredPhrase: 'Test Card',
            collection: { id: 'c123' },
            boards: [],
            content: await resource('test_card_expected_output.html')
        }));
    });
});

describe.each([
    ['upload', true],
    ['upload', false],
    ['auto', false],
])('when imageHandler is upload', (imageHandler, isPublic) => {
    it.each([
        ['test/resources/test_card_with_local_image.md', 'test_card_with_local_image_expected_output.html'],
        ['test/resources/test_card_with_local_root_image.md', 'test_card_with_local_image_expected_output.html']
    ])('uploads images', async(filePath, expected) => {
        const client = createClient({
            attachmentResult: { link: 'https://example.com/attachment.png' }
        });

        await handleCard({
            client,
            filePath,
            cardTitle: 'Local Image',
            collectionId: 'c123',
            imageHandler,
            github: { isPublic }
        });

        expect(client.getCalls()[0]).toMatchObject({
            type: 'uploadAttachment',
            fileName: 'empty.png',
            options: {
                headers: {
                    accept: 'application/json',
                    authorization: 'Basic dW5kZWZpbmVkOnVuZGVmaW5lZA=='
                }
            }
        });

        expect(client.getCalls()[1].options.body.content).toEqual(
            await resource(expected)
        );
    });
});

describe.each([
    ['github_urls', true],
    ['github_urls', false],
    ['auto', true],
])('when imageHandler is github_urls', (imageHandler, isPublic) => {
    it.each([
        ['test/resources/test_card_with_local_image.md', 'test_card_with_github_urls_image_expected_output.html'],
        ['test/resources/test_card_with_local_root_image.md', 'test_card_with_github_urls_image_expected_output.html']
    ])('uses GitHub image URLs', async(filePath, expected) => {
        const client = createClient();

        await handleCard({
            client,
            filePath,
            cardTitle: 'Local Image',
            collectionId: 'c123',
            imageHandler,
            github: { isPublic }
        });

        expect(client.getCalls()[0].options.body.content).toEqual(
            await resource(expected)
        );
    });
});

test('with string card footer appends it', async() => {
    const client = createClient();

    await handleCard({
        client,
        filePath: 'test/resources/test_card.md',
        cardTitle: 'Test Card',
        collectionId: 'c123',
        cardFooter: '<{{repository_url}}>'
    });

    expect(client.getCalls()[0].options.body.content).toEqual(
        await resource('test_card_with_footer_expected_output.html')
    );
});

test.each([
    [true],
    [undefined],
    [null]
])('with true or undefined or null card footer appends default', async(cardFooter) => {
    const client = createClient();

    await handleCard({
        client,
        filePath: 'test/resources/test_card.md',
        cardTitle: 'Test Card',
        collectionId: 'c123',
        cardFooter,
        defaultCardFooter: '<{{repository_url}}>'
    });

    expect(client.getCalls()[client.getCalls().length - 1].options.body.content).toEqual(
        await resource('test_card_with_footer_expected_output.html')
    );
});

test('with no card footer given appends default', async() => {
    const client = createClient();

    await handleCard({
        client,
        filePath: 'test/resources/test_card.md',
        cardTitle: 'Test Card',
        collectionId: 'c123',
        defaultCardFooter: '<{{repository_url}}>'
    });

    expect(client.getCalls()[client.getCalls().length - 1].options.body.content).toEqual(
        await resource('test_card_with_footer_expected_output.html')
    );
});

test.each([
    [''],
    [false],
    [123],
    [123.45]
])('with any other non-string card footer does not append it', async(cardFooter) => {
    const client = createClient();

    await handleCard({
        client,
        filePath: 'test/resources/test_card.md',
        cardTitle: 'Test Card',
        collectionId: 'c123',
        cardFooter,
        defaultCardFooter: '<{{repository_url}}>'
    });

    expect(client.getCalls()[client.getCalls().length - 1].options.body.content).toEqual(
        await resource('test_card_expected_output.html')
    );
});

describe('with unchanged file', () => {
    it('with a new card still creates it', async() => {
        const client = createClient();

        await handleCard({
            client,
            filePath: 'test/resources/test_card.md',
            cardTitle: 'Test Card',
            collectionId: 'c123',
            didFileChange: () => false
        });

        expect(client.getCalls().length).toBe(1);
        expect(client.getCalls()[0].type).toBe('createCard');
    });

    it('with an existing card ignores it', async() => {
        const client = createClient();

        await handleCard({
            client,
            filePath: 'test/resources/test_card.md',
            cardTitle: 'Test Card',
            collectionId: 'c123',
            didFileChange: () => false,
            existingCardIds: { 'test/resources/test_card.md': '123' }
        });

        expect(client.getCalls().length).toBe(0);
    });
});

test('with failed server JSON response throws proper error', async() => {
    const client = {
        getCard() {
            return {
                ok: false,

                status: 400,

                text() {
                    return JSON.stringify(this.json());
                },

                json() {
                    return { description: 'Custom error message!' };
                }
            };
        }
    };

    let error = null;
    let response = null;

    try {
        response = await handleCard({
            client,
            filePath: 'test/resources/test_card.md',
            cardTitle: 'Test Card',
            collectionId: 'c123',
            existingCardIds: { 'test/resources/test_card.md': 'card123', }
        });
    }
    catch (e) {
        if(e instanceof FetchError) {
            error = e;
        }
        else {
            throw e;
        }
    }

    expect(response).toBe(null);
    expect(error.toString()).toBe('FetchError: Server responded with a 400 status code: Custom error message!');
    expect(error.response.status).toBe(400);
});

test('with failed server text response throws proper error', async() => {
    const client = {
        getCard() {
            return {
                ok: false,

                status: 403,

                text() {
                    return 'Some error response.';
                },

                json() {
                    return null;
                }
            };
        }
    };

    let error = null;
    let response = null;

    try {
        response = await handleCard({
            client,
            filePath: 'test/resources/test_card.md',
            cardTitle: 'Test Card',
            collectionId: 'c123',
            existingCardIds: { 'test/resources/test_card.md': 'card123', }
        });
    }
    catch (e) {
        if(e instanceof FetchError) {
            error = e;
        }
        else {
            throw e;
        }
    }

    expect(response).toBe(null);
    expect(error.toString()).toBe('FetchError: Server responded with a 403 status code');
    expect(error.response.status).toBe(403);
});


test('with non-JSON server response throws proper error', async() => {
    const client = {
        getCard() {
            return {
                ok: true,

                status: 200,

                text() {
                    return 'Random response.';
                },

                json() {
                    return null;
                }
            };
        }
    };

    let error = null;
    let response = null;

    try {
        response = await handleCard({
            client,
            filePath: 'test/resources/test_card.md',
            cardTitle: 'Test Card',
            collectionId: 'c123',
            existingCardIds: { 'test/resources/test_card.md': 'card123', }
        });
    }
    catch (e) {
        if(e instanceof FetchError) {
            error = e;
        }
        else {
            throw e;
        }
    }

    expect(response).toBe(null);
    expect(error.toString()).toBe('FetchError: Server responded with an invalid response');
    expect(error.response.text()).toBe('Random response.');
});