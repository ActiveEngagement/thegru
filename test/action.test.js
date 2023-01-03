import action from '../src/action.js';
import baseCreateApi from '../src/api.js';
import { FetchError } from '../src/error.js';
import createClient from './support/api_client.js';
import { resource } from './support/util.js';

test('creates new card in collection if none exists', async() => {
    const client = createClient({
        searchResult: {
            cards: [
                {
                    id: 'wrong-title',
                    preferredPhrase: 'Wrong Title'
                },
                {
                    id: 'in-board',
                    preferredPhrase: 'Test Card',
                    boards: [{ id: 'b123' }]
                }
            ]
        }
    });

    await action({
        client,
        filePath: 'test/resources/test_card.md',
        cardTitle: 'Test Card',
        collectionId: 'c123'
    });

    expect(client.getCalls()[client.getCalls().length - 1]).toEqual({
        type: 'createCard',
        options: {
            body: {
                shareStatus: 'TEAM',
                preferredPhrase: 'Test Card',
                collection: { id: 'c123' },
                boards: [],
                content: await resource('test_card_expected_output.html')
            },
            headers: {
                accept: 'application/json',
                authorization: 'Basic dW5kZWZpbmVkOnVuZGVmaW5lZA==',
                'content-type': 'application/json'
            }
        }
    });
});

test('creates new card in board if none exists', async() => {
    const client = createClient({
        cardsForBoardResult: {
            items: [
                {
                    type: 'fact',
                    id: 'wrong-title',
                    preferredPhrase: 'Wrong Title',
                },
                {
                    type: 'section',
                    id: 's123',
                    items: [
                        {
                            type: 'fact',
                            id: 'in-section',
                            preferredPhrase: 'Test Card'
                        }
                    ]
                }
            ]
        }
    });

    await action({
        client,
        filePath: 'test/resources/test_card.md',
        cardTitle: 'Test Card',
        collectionId: 'c123',
        boardId: 'b123'
    });

    expect(client.getCalls()[client.getCalls().length - 1]).toEqual({
        type: 'createCard',
        options: {
            body: {
                shareStatus: 'TEAM',
                preferredPhrase: 'Test Card',
                collection: { id: 'c123' },
                boards: [{ id: 'b123' }],
                content: await resource('test_card_expected_output.html')
            },
            headers: {
                accept: 'application/json',
                authorization: 'Basic dW5kZWZpbmVkOnVuZGVmaW5lZA==',
                'content-type': 'application/json'
            }
        }
    });
});

test('creates new card in board section if none exists', async() => {
    const client = createClient({
        cardsForBoardResult: {
            items: [
                {
                    type: 'fact',
                    id: 'wrong-title',
                    preferredPhrase: 'Wrong Title',
                },
                {
                    type: 'fact',
                    id: 'not-in-section',
                    preferredPhrase: 'Test Card',
                },
                {
                    type: 'section',
                    id: 's123',
                    items: [
                        {
                            type: 'fact',
                            id: 'wrong-title',
                            preferredPhrase: 'Wrong Title'
                        }
                    ]
                }
            ]
        }
    });

    await action({
        client,
        filePath: 'test/resources/test_card.md',
        cardTitle: 'Test Card',
        collectionId: 'c123',
        boardId: 'b123',
        boardSectionId: 's123'
    });

    expect(client.getCalls()[client.getCalls().length - 1]).toEqual({
        type: 'createCard',
        options: {
            body: {
                shareStatus: 'TEAM',
                preferredPhrase: 'Test Card',
                collection: { id: 'c123' },
                boards: [
                    {
                        id: 'b123',
                        action: {
                            actionType: 'add',
                            prevSiblingItem: 's123',
                            sectionId: 's123'
                        }
                    }
                ],
                content: await resource('test_card_expected_output.html')
            },
            headers: {
                accept: 'application/json',
                authorization: 'Basic dW5kZWZpbmVkOnVuZGVmaW5lZA==',
                'content-type': 'application/json'
            }
        }
    });
});

test('updates existing card in collection', async() => {
    const client = createClient({
        searchResult: {
            cards: [
                {
                    id: 'wrong-title',
                    preferredPhrase: 'Wrong Title'
                },
                {
                    id: 'in-board',
                    preferredPhrase: 'Test Card',
                    boards: [{ id: 'b123' }]
                },
                {
                    id: 'target',
                    preferredPhrase: 'Test Card',
                    boards: []
                }
            ]
        }
    });

    await action({
        client,
        filePath: 'test/resources/test_card.md',
        cardTitle: 'Test Card',
        collectionId: 'c123'
    });

    expect(client.getCalls()[client.getCalls().length - 1]).toEqual({
        type: 'updateCard',
        id: 'target',
        options: {
            body: {
                id: 'target',
                preferredPhrase: 'Test Card',
                boards: [],
                content: await resource('test_card_expected_output.html')
            },
            headers: {
                accept: 'application/json',
                authorization: 'Basic dW5kZWZpbmVkOnVuZGVmaW5lZA==',
                'content-type': 'application/json'
            }
        }
    });
});

test('updates existing card in board', async() => {
    const client = createClient({
        cardsForBoardResult: {
            items: [
                {
                    type: 'fact',
                    id: 'wrong-title',
                    preferredPhrase: 'Wrong Title',
                },
                {
                    type: 'section',
                    id: 's123',
                    items: [
                        {
                            type: 'fact',
                            id: 'in-section',
                            preferredPhrase: 'Test Card'
                        }
                    ]
                },
                {
                    type: 'fact',
                    id: 'target',
                    preferredPhrase: 'Test Card'
                }
            ]
        }
    });

    await action({
        client,
        filePath: 'test/resources/test_card.md',
        cardTitle: 'Test Card',
        collectionId: 'c123',
        boardId: 'b123'
    });

    expect(client.getCalls()[client.getCalls().length - 1]).toEqual({
        type: 'updateCard',
        id: 'target',
        options: {
            body: {
                type: 'fact',
                id: 'target',
                preferredPhrase: 'Test Card',
                content: await resource('test_card_expected_output.html')
            },
            headers: {
                accept: 'application/json',
                authorization: 'Basic dW5kZWZpbmVkOnVuZGVmaW5lZA==',
                'content-type': 'application/json'
            }
        }
    });
});

test('updates existing card in board section', async() => {
    const client = createClient({
        cardsForBoardResult: {
            items: [
                {
                    type: 'fact',
                    id: 'wrong-title',
                    preferredPhrase: 'Wrong Title',
                },
                {
                    type: 'fact',
                    id: 'not-in-section',
                    preferredPhrase: 'Test Card',
                },
                {
                    type: 'section',
                    id: 's123',
                    items: [
                        {
                            type: 'fact',
                            id: 'wrong-title',
                            preferredPhrase: 'Wrong Title'
                        },
                        {
                            type: 'fact',
                            id: 'target',
                            preferredPhrase: 'Test Card'
                        }
                    ]
                }
            ]
        }
    });

    await action({
        client,
        filePath: 'test/resources/test_card.md',
        cardTitle: 'Test Card',
        collectionId: 'c123',
        boardId: 'b123',
        boardSectionId: 's123'
    });

    expect(client.getCalls()[client.getCalls().length - 1]).toEqual({
        type: 'updateCard',
        id: 'target',
        options: {
            body: {
                type: 'fact',
                id: 'target',
                preferredPhrase: 'Test Card',
                content: await resource('test_card_expected_output.html')
            },
            headers: {
                accept: 'application/json',
                authorization: 'Basic dW5kZWZpbmVkOnVuZGVmaW5lZA==',
                'content-type': 'application/json'
            }
        }
    });
});

test('uploads local images', async() => {
    const client = createClient({
        searchResult: { cards: [] },
        attachmentResult: { link: 'https://example.com/attachment.png' }
    });

    await action({
        client,
        filePath: 'test/resources/test_card_with_local_image.md',
        cardTitle: 'Local Image',
        collectionId: 'c123',
    });

    expect(client.getCalls()[client.getCalls().length - 3]).toMatchObject({
        type: 'uploadAttachment',
        fileName: 'empty.png',
        options: {
            headers: {
                accept: 'application/json',
                authorization: 'Basic dW5kZWZpbmVkOnVuZGVmaW5lZA=='
            }
        }
    });

    expect(client.getCalls()[client.getCalls().length - 1].options.body.content).toEqual(
        await resource('test_card_with_local_image_expected_output.html')
    );
});

test('with string card footer appends it', async() => {
    const client = createClient({ searchResult: { cards: [] } });

    await action({
        client,
        filePath: 'test/resources/test_card.md',
        cardTitle: 'Test Card',
        collectionId: 'c123',
        cardFooter: '<{{repository_url}}>',
        repositoryUrl: 'https://example.com'
    });

    expect(client.getCalls()[client.getCalls().length - 1].options.body.content).toEqual(
        await resource('test_card_with_footer_expected_output.html')
    );
});

test.each([[true], [undefined], [null]])('with true or undefined or null card footer appends default', async(cardFooter) => {
    const client = createClient({ searchResult: { cards: [] } });

    await action({
        client,
        filePath: 'test/resources/test_card.md',
        cardTitle: 'Test Card',
        collectionId: 'c123',
        cardFooter,
        repositoryUrl: 'https://example.com',
        defaultCardFooter: '<{{repository_url}}>'
    });

    expect(client.getCalls()[client.getCalls().length - 1].options.body.content).toEqual(
        await resource('test_card_with_footer_expected_output.html')
    );
});

test('with no card footer given appends default', async() => {
    const client = createClient({ searchResult: { cards: [] } });

    await action({
        client,
        filePath: 'test/resources/test_card.md',
        cardTitle: 'Test Card',
        collectionId: 'c123',
        repositoryUrl: 'https://example.com',
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
    const client = createClient({ searchResult: { cards: [] } });

    await action({
        client,
        filePath: 'test/resources/test_card.md',
        cardTitle: 'Test Card',
        collectionId: 'c123',
        cardFooter,
        repositoryUrl: 'https://example.com',
        defaultCardFooter: '<{{repository_url}}>'
    });

    expect(client.getCalls()[client.getCalls().length - 1].options.body.content).toEqual(
        await resource('test_card_expected_output.html')
    );
});

test('with failed server JSON response throws proper error', async() => {
    const client = {
        searchCards() {
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
        response = await action({
            client,
            filePath: 'test/resources/test_card.md',
            cardTitle: 'Test Card',
            collectionId: 'c123'
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
});

test('with failed server text response throws proper error', async() => {
    const client = {
        searchCards() {
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
        response = await action({
            client,
            filePath: 'test/resources/test_card.md',
            cardTitle: 'Test Card',
            collectionId: 'c123'
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
});

test('with null server response throws proper error', async() => {
    const client = {
        searchCards() {
            return {
                ok: true,

                status: 200,

                text() {
                    return null;
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
        response = await action({
            client,
            filePath: 'test/resources/test_card.md',
            cardTitle: 'Test Card',
            collectionId: 'c123'
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
});

test('with non-JSON server response throws proper error', async() => {
    const client = {
        searchCards() {
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
        response = await action({
            client,
            filePath: 'test/resources/test_card.md',
            cardTitle: 'Test Card',
            collectionId: 'c123'
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
});