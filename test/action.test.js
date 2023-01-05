import runAction from '../src/action.js';
import { FetchError } from '../src/error.js';
import createClient from './support/api_client.js';
import { resource } from './support/util.js';
import fs from 'fs';
import { readFile, writeFile } from '../src/fs_util.js';

beforeEach(async() => {
    if(fs.existsSync('test/env')) {
        await fs.promises.rm('test/env', { recursive: true });
    }
    await fs.promises.mkdir('test/env');
});

async function initCardFile(cardIds) {

    cardIds = [cardIds].flat();
    await writeFile('test/env/uploaded-cards.json', JSON.stringify(cardIds));
}

async function action(options) {
    options.cardsFile ||= 'test/env/uploaded-cards.json';
    options.commitCardsFile ||= () => { };

    return await runAction(options);
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
    [false]
    [[]]
])('when no cards are present', (cardsFileIds) => {
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
        let gitCall = null;

        beforeEach(async() => {
            if (cardsFileIds) {
                await initCardFile(cardsFileIds);
            }

            client = createClient({ createCardResult: { id: 'newCard123' } });

            await action({
                client,
                commitCardsFile: options => gitCall = options,
                filePath: 'test/resources/test_card.md',
                cardTitle: 'Test Card',
                collectionId: 'c123',
                boardId,
                boardSectionId
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

        it('saves the id to the cards file', async() => {
            expect(JSON.parse(await readFile('test/env/uploaded-cards.json'))).toStrictEqual(['newCard123']);
        });

        it('adds, commits, and pushes the cards file to git', () => {
            expect(gitCall.path).toBe('test/env/uploaded-cards.json');
            expect(typeof gitCall.email).toBe('string');
            expect(typeof gitCall.name).toBe('string');
            expect(typeof gitCall.message).toBe('string');
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
    let gitCall = null;

    beforeEach(async() => {
        await initCardFile('existing123');
        client = createClient({ getCardResult: { } });

        await action({
            client,
            filePath: 'test/resources/test_card.md',
            commitCardsFile: options => gitCall = options,
            cardTitle: 'Final',
            collectionId,
            boardId,
            boardSectionId
        });
    });

    it('updates the card', async() => {
        expect(client.getCalls()[1]).toEqual(updateCardApiCall({
            content: await resource('test_card_expected_output.html')
        }));
    });

    it('does not change the cards file', async() => {
        expect(JSON.parse(await readFile('test/env/uploaded-cards.json'))).toStrictEqual(['existing123']);
    });

    it('does not make a git call', () => {
        expect(gitCall).toBe(null);
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
    let gitCall = null;

    beforeEach(async() => {
        await initCardFile('2983423894');
        client = createClient({
            getCardResult: null,
            createCardResult: { id: 'newCard123' }
        });

        await action({
            client,
            commitCardsFile: options => gitCall = options,
            filePath: 'test/resources/test_card.md',
            cardTitle: 'Test Card',
            collectionId: 'c123',
            boardId,
            boardSectionId
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

    it('replaces the card id in the cards file', async() => {
        expect(JSON.parse(await readFile('test/env/uploaded-cards.json'))).toStrictEqual(['newCard123']);
    });

    it('adds, commits, and pushes the cards file to git', () => {
        expect(gitCall.path).toBe('test/env/uploaded-cards.json');
        expect(typeof gitCall.email).toBe('string');
        expect(typeof gitCall.name).toBe('string');
        expect(typeof gitCall.message).toBe('string');
    });
});

it('uploads local images', async() => {
    const client = createClient({
        attachmentResult: { link: 'https://example.com/attachment.png' }
    });

    await action({
        client,
        filePath: 'test/resources/test_card_with_local_image.md',
        cardTitle: 'Local Image',
        collectionId: 'c123',
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
        await resource('test_card_with_local_image_expected_output.html')
    );
});

test('with string card footer appends it', async() => {
    const client = createClient();

    await action({
        client,
        filePath: 'test/resources/test_card.md',
        cardTitle: 'Test Card',
        collectionId: 'c123',
        cardFooter: '<{{repository_url}}>',
        repositoryUrl: 'https://example.com'
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
    const client = createClient();

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
    const client = createClient();

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

    initCardFile('card123');

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

    initCardFile('123');

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
        getCard() {
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

    initCardFile('123');

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
    initCardFile('123');

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