import runHandleCard from '../../src/core/standard/handle_card.js';
import createApi from '../../src/core/api.js';
import { FetchError } from '../../src/core/error.js';
import createClient from '../support/api_client.js';
import { resource, createCardApiCall, updateCardApiCall } from '../support/util.js';
import nullLogger from '../support/null_logger.js';
import attempt from '../../src/core/attempt.js';

async function handleCard(options) {
    options.logger ||= nullLogger();
    if(options.client) {
        options.api = createApi(options.client, { logger: options.logger });
        delete options.client;
    }
    options.github ||= {};
    options.github.repo ||= {};
    options.github.repo.url ||= 'https://example.com';
    options.github.repo.name ||= 'ActiveEngagement/test';
    options.github.commit ||= {};
    options.github.commit.sha ||= '1234567890';
    if(options.github.repo.isPublic === undefined) {
        options.github.repo.isPublic = false;
    }
    options.inputs ||= {};
    options.imageHandler ||= 'auto';
    options.existingCardIds ||= [];
    options.didFileChange ||= () => true;

    return await runHandleCard(options.filePath, options.cardTitle, options);
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
                existingCardIds,
                inputs: {
                    collectionId: 'c123',
                    boardId,
                    boardSectionId,
                }
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
            existingCardIds: { 'test/resources/test_card.md': 'existing123' },
            inputs: {
                collectionId,
                boardId,
                boardSectionId,
            }
        });
    });

    it('updates the card', async() => {
        expect(client.getCalls()[1]).toEqual(updateCardApiCall({
            preferredPhrase: 'Final',
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
            getCardResult: 'not_found',
            createCardResult: { id: 'newCard123' }
        });

        await handleCard({
            client,
            filePath: 'test/resources/test_card.md',
            cardTitle: 'Test Card',
            existingCardIds: { 'test/resources/test_card.md': '234982093483' },
            inputs: {
                collectionId: 'c123',
                boardId,
                boardSectionId,
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
            existingCardIds: { 'test/resources/test_card.md': 'card123' },
            inputs: {
                collectionId: 'c123',
            }
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
])('when imageHandler is upload', (imageHandler, isPublic) => {
    describe.each([
        ['test/resources/test_card_with_local_image.md', 'test_card_with_local_image_expected_output.html'],
        ['test/resources/test_card_with_local_root_image.md', 'test_card_with_local_image_expected_output.html']
    ])('with normal or root image', (filePath, expected) => {
        let client = null;

        beforeEach(async() => {
            client = createClient({
                attachmentResult: {
                    filename: 'attachment.png',
                    attachmentId: '123',
                    link: 'https://example.com/attachment.png',
                    mimeType: 'image/png',
                    size: 1023
                }
            });

            await handleCard({
                client,
                filePath,
                cardTitle: 'Local Image',
                imageHandler,
                github: { repo: { isPublic } },
                inputs: {
                    collectionId: 'c123',
                }
            });
        });

        it('uploads images', () => {
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
        });

        it('includes the attachment in the card', () => {
            expect(client.getCalls()[1].options.body.attachments).toStrictEqual([
                {
                    extension: 'png',
                    filename: 'attachment.png',
                    id: '123',
                    link: 'https://example.com/attachment.png',
                    mimetype: 'image/png',
                    size: 1023
                }
            ]);
        });

        it('renders the content correctly', async() => {
            expect(client.getCalls()[1].options.body.content).toEqual(
                await resource(expected)
            );
        });
    });
});

describe.each([
    ['github_urls', true],
    ['github_urls', false]
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
            imageHandler,
            github: { repo: { isPublic } },
            inputs: {
                collectionId: 'c123'
            }
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
        footer: '<{{repository_url}}>',
        inputs: {
            collectionId: 'c123',
        }
    });

    expect(client.getCalls()[0].options.body.content).toEqual(
        await resource('test_card_with_footer_expected_output.html')
    );
});

describe('with unchanged file', () => {
    it('with a new card still creates it', async() => {
        const client = createClient();

        await handleCard({
            client,
            filePath: 'test/resources/test_card.md',
            cardTitle: 'Test Card',
            didFileChange: () => false,
            inputs: {
                collectionId: 'c123'
            }
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

    test.each([
        ['test_card_with_local_image.md'],
        ['test_card_with_local_parent_image.md'],
        ['test_card_with_local_root_image.md'],
    ])('with changed referenced image', async(card) => {
        const client = createClient();

        await handleCard({
            client,
            filePath: 'test/resources/' + card,
            cardTitle: 'Test Card',
            didFileChange: (file) => file === 'test/resources/empty.png',
            inputs: {
                collectionId: 'c123'
            }
        });

        expect(client.getCalls().length).toBe(1);
        expect(client.getCalls()[0].type).toBe('createCard');
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

    await attempt()
        .catch(FetchError, e => error = e)
        .do(async() => {
            response = await handleCard({
                client,
                filePath: 'test/resources/test_card.md',
                cardTitle: 'Test Card',
                existingCardIds: { 'test/resources/test_card.md': 'card123' },
                inputs: {
                    collectionId: 'c123'
                }
            });
        });

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

    await attempt()
        .catch(FetchError, e => error = e)
        .do(async() => {
            response = await handleCard({
                client,
                filePath: 'test/resources/test_card.md',
                cardTitle: 'Test Card',
                existingCardIds: { 'test/resources/test_card.md': 'card123', },
                inputs: {
                    collectionId: 'c123',
                }
            });
        });

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
            existingCardIds: { 'test/resources/test_card.md': 'card123', },
            inputs: {
                collectionId: 'c123',
            }
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