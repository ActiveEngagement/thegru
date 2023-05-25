import '../../../src/core/tap.js';
import runAction from '../../../src/core/action.js';
import createClientBase from '../../support/api_client.js';
import { apiCall, createCardApiCall, resource } from '../../support/util.js';
import nullColorizer from '../../../src/core/null_colorizer.js';
import { readFile, writeFile } from '../../../src/core/fs_util.js';
import arrayLogger from '../../support/array_logger.js';
import nullLogger from '../../support/null_logger.js';
import env from '../../support/env.js';
import { TheGuruError } from '../../../src/core/error.js';

async function initCardsFile(data) {
    writeFile('uploaded-cards.json', JSON.stringify(data));
}

function createClient(options = {}) {
    options.getCollectionsResult ||= [
        {
            id: 'c123',
            slug: 'collection-123-slug',
            collectionType: 'INTERNAL'
        }
    ];

    return createClientBase(options);
}

async function action(options) {
    options.logger ||= nullLogger();
    options.colors ||= nullColorizer();
    options.inputs ||= {};
    if(options.inputs.cardsFile === undefined) {
        options.inputs.cardsFile = 'uploaded-cards.json';
    }
    options.inputs.attachmentHandler ||= 'auto';
    options.inputs.collectionType ||= 'standard';
    options.defaultFooter ||= '<{{repository_url}}>';
    if(options.footer === undefined) {
        options.footer = true;
    }
    options.github ||= {};
    options.github.repo ||= {};
    options.github.repo.url ||= 'https://example.com/ActiveEngagement/test';
    options.github.repo.name ||= 'ActiveEngagement/test';
    options.github.commit ||= {};
    options.github.commit.sha ||= '123';
    if(options.github.commit.message === undefined) {
        options.github.commit.message = ' ';
    }
    if(options.github.repo.isPublic === undefined) {
        options.github.repo.isPublic = false;
    }
    options.commitCardsFile ||= () => {};
    options.isFileCommitted ||= () => true;

    return await runAction(options);
}

describe('action.js', () => {
    beforeEach(async() => {
        env({
            path: {
                to: {
                    'image.png': '[png]',
                    'file.pdf': '[pdf]'
                }
            },
            'one.md': resource('markdown/basic_card.md'),
            'two.md': resource('markdown/basic_card.md'),
            'three.md': resource('markdown/basic_card.md'),
            'with_attachments.md': resource('markdown/card_with_attachments.md')
        });
    });

    describe('in a typical scenario', () => {
        let client, gitCall, expectedContent, logger;

        beforeEach(async() => {
            await initCardsFile({
                'one.md': '123',
                'two.md': '456',
                'removed_locally': '000'
            });

            client = createClient({
                createCardResult: { id: '789' },
                getCardResult: (id) => id === '123' || id === '456'  || id === 'unchanged123' ? { id } : 'not_found'
            });

            logger = arrayLogger();

            expectedContent = resource('markdown/basic_card_rendered.md');

            await action({
                logger,
                client,
                commitCardsFile: options => gitCall = options,
                inputs: {
                    collectionId: 'c123',
                    cards: [
                        'one.md',
                        {
                            path: 'two.md',
                            title: 'Test 456'
                        },
                        {
                            path: 'three.md',
                            title: 'Test 789'
                        },
                    ],
                    cardFooter: false
                }
            });
        });

        it('updates 123', () => {
            const call = client.getCalls().find((call) => 
                call.type === 'updateCard' &&
                call.id === '123'
            );
            expect(call).toBeTruthy();
            expect(call.options.body.content).toBe(expectedContent);
        });

        it('updates 456', () => {
            const call = client.getCalls().find((call) => 
                call.type === 'updateCard' &&
                call.id === '456'
            );
            expect(call).toBeTruthy();
            expect(call.options.body.content).toBe(expectedContent);
        });

        it('creates 789', () => {
            const call = client.getCalls().find((call) => 
                call.type === 'createCard' &&
                call.options.body.preferredPhrase === 'Test 789'
            );
            expect(call).toBeTruthy();
            expect(call.options.body.content).toBe(expectedContent);
        });

        it('destroys 000', () => {
            const call = client.getCalls().find((call) =>
                call.type === 'destroyCard' &&
                call.id === '000'
            );
            expect(call).toBeTruthy();
        });

        it('correctly updates the cards file', async() => {
            expect(JSON.parse(readFile('uploaded-cards.json'))).toStrictEqual({
                'one.md': '123',
                'two.md': '456',
                'three.md': '789'
            });
        });

        it('attempts to commit the cards file', () => {
            expect(gitCall.path).toBe('uploaded-cards.json');
            expect(typeof gitCall.email).toBe('string');
            expect(typeof gitCall.name).toBe('string');
            expect(typeof gitCall.message).toBe('string');
        });
    });

    describe('with custom card keys', () => {
        let client, gitCall, expectedContent, logger;

        beforeEach(async() => {
            await initCardsFile({
                'key123': '123',
                'key456': '456',
                'key000': '000'
            });

            client = createClient({
                createCardResult: { id: '789' },
                getCardResult: (id) => id === '123' || id === '456'  || id === 'unchanged123' ? { id } : 'not_found'
            });

            logger = arrayLogger();

            expectedContent = resource('markdown/basic_card_rendered.md');

            await action({
                logger,
                client,
                commitCardsFile: options => gitCall = options,
                inputs: {
                    collectionId: 'c123',
                    cards: [
                        {
                            path: 'one.md',
                            title: 'Test 123',
                            key: 'key123'
                        },
                        {
                            path: 'two.md',
                            title: 'Test 456',
                            key: 'key456'
                        },
                        {
                            path: 'three.md',
                            title: 'Test 789',
                            key: 'key789'
                        },
                    ],
                    cardFooter: false
                }
            });
        });

        it('updates 123', () => {
            const call = client.getCalls().find((call) => 
                call.type === 'updateCard' &&
                call.id === '123'
            );
            expect(call).toBeTruthy();
            expect(call.options.body.content).toBe(expectedContent);
        });

        it('updates 456', () => {
            const call = client.getCalls().find((call) => 
                call.type === 'updateCard' &&
                call.id === '456'
            );
            expect(call).toBeTruthy();
            expect(call.options.body.content).toBe(expectedContent);
        });

        it('creates 789', () => {
            const call = client.getCalls().find((call) => 
                call.type === 'createCard' &&
                call.options.body.preferredPhrase === 'Test 789'
            );
            expect(call).toBeTruthy();
            expect(call.options.body.content).toBe(expectedContent);
        });

        it('destroys 000', () => {
            const call = client.getCalls().find((call) =>
                call.type === 'destroyCard' &&
                call.id === '000'
            );
            expect(call).toBeTruthy();
        });

        it('correctly updates the cards file', async() => {
            expect(JSON.parse(readFile('uploaded-cards.json'))).toStrictEqual({
                'key123': '123',
                'key456': '456',
                'key789': '789'
            });
        });

        it('attempts to commit the cards file', () => {
            expect(gitCall.path).toBe('uploaded-cards.json');
            expect(typeof gitCall.email).toBe('string');
            expect(typeof gitCall.name).toBe('string');
            expect(typeof gitCall.message).toBe('string');
        });
    });

    describe('with nonexistent cards file', () => {
        beforeEach(async() => {
            await action({
                client: createClient({
                    createCardResult: { id: '123' }
                }),
                inputs: {
                    collectionId: 'c123',
                    cards: [
                        {
                            path: 'one.md',
                            title: 'Test 123'
                        },
                        {
                            path: 'two.md',
                            title: 'Test 789'
                        },
                        {
                            path: 'three.md',
                            title: 'Test 456'
                        }
                    ]
                }
            });
        });

        it('creates the cards file', () => {
            expect(JSON.parse(readFile('uploaded-cards.json'))).toStrictEqual({
                'one.md': '123',
                'two.md': '123',
                'three.md': '123'
            });
        });
    });

    describe('with auto image handler', () => {
        describe('with public repo', () => {
            let client = null;

            beforeEach(async() => {
                client = createClient({
                    createCardResult: { id: '123' }
                });

                await action({
                    client,
                    inputs: {
                        collectionId: 'c123',
                        cards: [
                            {
                                path: 'with_attachments.md',
                                title: 'Test 123'
                            }
                        ],
                        cardFooter: false
                    },
                    github: { repo: { isPublic: true } },
                });
            });

            it('rewrites the URLs to GitHub', () => {
                expect(client.getCalls()[1].options.body.content).toBe(
                    resource('markdown/card_with_attachments.md')
                        .replace('path/to/image.png', 'https://raw.githubusercontent.com/ActiveEngagement/test/123/path/to/image.png')
                        .replace('path/to/file.pdf', 'https://raw.githubusercontent.com/ActiveEngagement/test/123/path/to/file.pdf')
                );
            });
        });

        describe('with private repo', () => {
            let client = null;

            beforeEach(async() => {
                client = createClient({
                    createCardResult: { id: '123' },
                    uploadAttachmentResult: {
                        link: 'image-link',
                        filename: 'somefile.png'
                    }
                });

                await action({
                    client,
                    inputs: {
                        collectionId: 'c123',
                        cards: [
                            {
                                path: 'with_attachments.md',
                                title: 'Test 123'
                            }
                        ],
                        cardFooter: false
                    },
                    github: { repo: { isPublic: false } },
                });
            });

            it('rewrites the URLs', async() => {
                expect(client.getCalls()[3].options.body.content).toBe(
                    resource('markdown/card_with_attachments.md')
                        .replace('path/to/image.png', 'image-link')
                        .replace('path/to/file.pdf', 'image-link')
                );
            });
        });
    });

    describe('with collection slug', () => {
        it('finds the collection', async() => {
            const client = createClient();
            await action({
                client,
                inputs: {
                    collectionId: 'collection-123-slug',
                    cards: [ 'one.md' ]
                }
            });

            expect(client.getCalls()[1].type).toBe('createCard');
        });
    });

    describe('with external collection', () => {
        it('throws an appropriate error', async() => {
            const client = createClient({
                getCollectionsResult: [
                    {
                        id: 'c123',
                        collectionType: 'EXTERNAL'
                    }
                ]
            });

            const f = async() => await action({
                client,
                inputs: {
                    collectionId: 'c123'
                }
            });

            expect(f).rejects.toThrow(TheGuruError);
            expect(f).rejects.toThrow('We expected a Standard Collection but the provided collection c123 is a Synced Collection!');
        });
    });

    describe('with nonexistent collection', () => {
        it('throws an appropriate error', async() => {
            const client = createClient();

            const f = async() => await action({
                client,
                inputs: {
                    collectionId: 'c456'
                }
            });

            expect(f).rejects.toThrow(TheGuruError);
            expect(f).rejects.toThrow('Collection with id c456 not found!');
        });
    });

    describe('with no cards file', () => {
        let client, expectedContent, logger;

        beforeEach(async() => {
            client = createClient({
            });

            logger = arrayLogger();

            expectedContent = resource('markdown/basic_card_rendered.md');

            await action({
                logger,
                client,
                inputs: {
                    collectionId: 'c123',
                    cards: [
                        {
                            path: 'two.md',
                            title: 'Test Card'
                        }
                    ],
                    cardsFile: false,
                    cardFooter: false
                }
            });
        });

        it('creates the card', async() => {
            const call = client.getCalls().find((call) => 
                call.type === 'createCard' &&
                call.options.body.preferredPhrase === 'Test Card'
            );
            expect(call).toBeTruthy();
            expect(call.options.body.content).toBe(expectedContent);
        });

        it('emits a log notice', () => {
            const actual = logger.getMessages().some(msg => msg === 'Skipping update of the cards file since "cards_file" is "false".');
            expect(actual).toBe(true);
        });
    });

    describe('when a nonexistent card needs to be destroyed', () => {
        let client, logger;

        beforeEach(async() => {
            logger = arrayLogger();
            client = createClient({
                destroyCardResult: 'not_found'
            });
            await initCardsFile({
                nonexistent: 'card123'
            });
            await action({
                logger,
                client,
                inputs: {
                    collectionId: 'c123',
                    cards: []
                }
            });
        });

        it('makes the destroy request', () => {
            expect(client.getCalls()[1]).toStrictEqual(
                apiCall('destroyCard').tap(c => c.id = 'card123')
            );
        });

        it('emits an appropriate log message', () => {
            expect(logger.getMessages().some(m => m.startsWith('Card not destroyed. Guru returned a 404.')));
        });
    });

    describe('with board', () => {
        it('includes the board id in the request', async() => {
            const client = createClient();
            await action({
                client,
                inputs: {
                    collectionId: 'c123',
                    cards: ['one.md'],
                    boardId: 'b123',
                    cardFooter: false
                }
            });
            expect(client.getCalls()[1]).toStrictEqual(
                createCardApiCall({
                    preferredPhrase: 'One',
                    content: resource('markdown/basic_card_rendered.md'),
                    collection: { id: 'c123' },
                    boards: [
                        { id: 'b123' }
                    ]
                })
            );
        });
    });

    describe('with board and board section', () => {
        it('includes the board and board section ids in the request', async() => {
            const client = createClient();
            await action({
                client,
                inputs: {
                    collectionId: 'c123',
                    cards: ['one.md'],
                    boardId: 'b123',
                    boardSectionId: 's123',
                    cardFooter: false
                }
            });
            expect(client.getCalls()[1]).toStrictEqual(
                createCardApiCall({
                    preferredPhrase: 'One',
                    content: resource('markdown/basic_card_rendered.md'),
                    collection: { id: 'c123' },
                    boards: [
                        {
                            action: {
                                actionType: 'add',
                                prevSiblingItem: 's123',
                                sectionId: 's123'
                            },
                            id: 'b123'
                        }
                    ]
                })
            );
        });
    });
});