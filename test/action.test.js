import action from '../src/action.js';
import baseCreateApi from '../src/api.js';
import createClient from './support/api_client.js';
import { resource } from './support/util.js';

function createApi(client) {
    return baseCreateApi(client, {
        logger: {
            debug() {},

            isDebug() {
                return false;
            }
        }
    });
}

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
        api: createApi(client),
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
        api: createApi(client),
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
        api: createApi(client),
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
        api: createApi(client),
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
        api: createApi(client),
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
        api: createApi(client),
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