import runAction from '../../../src/core/action.js';
import createClientBase from '../../support/api_client.js';
import { resource } from '../../support/util.js';
import nullColorizer from '../../../src/gh_action/null_colorizer.js';
import { readFile, writeFile } from '../../../src/core/fs_util.js';
import arrayLogger from '../../support/array_logger.js';
import nullLogger from '../../support/null_logger.js';
import env from '../../support/env.js';

async function initCardsFile(data) {

    writeFile('uploaded-cards.json', JSON.stringify(data));
}

function createClient(options) {
    options.getCollectionsResult ||= [
        {
            id: 'c123',
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
    options.github.commit.sha ||= '1234567890';
    if(options.github.commit.message === undefined) {
        options.github.commit.message = ' ';
    }
    if(options.github.repo.isPublic === undefined) {
        options.github.repo.isPublic = false;
    }
    options.commitCardsFile ||= () => {};

    return await runAction(options);
}

describe('action.js', () => {
    beforeEach(async() => {
        env({
            'one.md': resource('markdown/basic_card.md'),
            'two.md': resource('markdown/basic_card.md'),
            'three.md': resource('markdown/basic_card.md')
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
                        {
                            path: 'one.md',
                            title: 'Test 123'
                        },
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
});