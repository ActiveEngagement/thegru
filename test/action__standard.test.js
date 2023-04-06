import runAction from '../src/core/action.js';
import createClientBase from './support/api_client.js';
import { resource } from './support/util.js';
import nullColorizer from '../src/gh_action/null_colorizer.js';
import { readFile, writeFile } from '../src/core/fs_util.js';
import arrayLogger from './support/array_logger.js';
import nullLogger from './support/null_logger.js';
import { InvalidGitObjectError } from '../src/core/error.js';
import env from './support/env.js';

async function initCardsFile(data) {

    await writeFile('test/env/uploaded-cards.json', JSON.stringify(data));
}

function createClient(options) {
    options.getCollectionResult ||= { collectionType: 'STANDARD' };

    return createClientBase(options);
}

async function action(options) {
    options.logger ||= nullLogger();
    options.colors ||= nullColorizer();
    options.inputs ||= {};
    options.inputs.cardsFile ||= 'test/env/uploaded-cards.json';
    options.inputs.attachmentHandler ||= 'auto';
    options.inputs.collectionType ||= 'standard';
    options.defaultFooter ||= '<{{repository_url}}>';
    if(options.footer === undefined) {
        options.footer = true;
    }
    options.github ||= {};
    options.github.repo ||= {};
    options.github.repo.url ||= 'https://example.com';
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
    options.getChangedFiles ||= () => [];

    return await runAction(options);
}

describe('action.js', () => {
    beforeEach(async() => {
        await env();
    });

    describe('in a typical scenario', () => {
        let client = null;
        let gitCall = null;
        let expectedContent = null;
        let logger = null;

        beforeEach(async() => {
            await initCardsFile({
                'test/resources/test_card.md': '123',
                'test/resources/test_card_unchanged.md': 'unchanged123',
                'test/resources/test_card_2.md': '456',
                'removed_locally': '000'
            });

            client = createClient({
                createCardResult: { id: '789' },
                getCardResult: (id) => id === '123' || id === '456' ? { id } : 'not_found'
            });

            logger = arrayLogger();

            expectedContent = await resource('test_card_with_footer_expected_output.html');

            await action({
                logger,
                client,
                commitCardsFile: options => gitCall = options,
                inputs: {
                    collectionId: 'c123',
                    cards: {
                        'test/resources/test_card.md': 'Test 123',
                        'test/resources/test_card_unchanged.md': 'unchanged123',
                        'test/resources/test_card_3.md': 'Test 789',
                        'test/resources/test_card_2.md': 'Test 456',
                    },
                },
                getChangedFiles: () => [
                    'test/resources/test_card.md',
                    'test/resources/test_card_2.md',
                    'removed_locally'
                ]
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

        it('skips unchanged123', () => {
            const actual = client.getCalls().some((call) => 
                call.type === 'updateCard' &&
                call.id === 'unchanged123'
            );
            expect(actual).toBe(false);
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
            expect(JSON.parse(await readFile('test/env/uploaded-cards.json'))).toStrictEqual({
                'test/resources/test_card.md': '123',
                'test/resources/test_card_3.md': '789',
                'test/resources/test_card_2.md': '456',
                'test/resources/test_card_unchanged.md': 'unchanged123'
            });
        });

        it('attempts to commit the cards file', () => {
            expect(gitCall.path).toBe('test/env/uploaded-cards.json');
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
                    cards: {
                        'test/resources/test_card.md': 'Test 123',
                        'test/resources/test_card_3.md': 'Test 789',
                        'test/resources/test_card_2.md': 'Test 456',
                    }
                }
            });
        });

        it('creates the cards file', async() => {
            expect(JSON.parse(await readFile('test/env/uploaded-cards.json'))).toStrictEqual({
                'test/resources/test_card.md': '123',
                'test/resources/test_card_3.md': '123',
                'test/resources/test_card_2.md': '123'
            });
        });
    });

    describe('with update_all', () => {
        let client = null;
        let expectedContent = null;
        let logger = null;
        let gitCall = null;

        beforeEach(async() => {
            await initCardsFile({ 'test/resources/test_card_unchanged.md': 'unchanged123' });

            client = createClient({
                getCardResult: { id: 'unchanged123' }
            });

            logger = arrayLogger();

            expectedContent = await resource('test_card_with_footer_expected_output.html');

            await action({
                logger,
                client,
                commitCardsFile: options => gitCall = options,
                inputs: {
                    collectionId: 'c123',
                    cards: { 'test/resources/test_card_unchanged.md': 'unchanged123' },
                    updateAll: true
                }
            });
        });

        it('updates the card, unchanged though it be', async() => {
            const call = client.getCalls().find((call) => 
                call.type === 'updateCard' &&
                call.id === 'unchanged123'
            );
            expect(call).toBeTruthy();
            expect(call.options.body.content).toBe(expectedContent);
        });

        it('emits a log notice', () => {
            const actual = logger.getMessages().some(msg => msg === '"update_all" is true. All cards will be updated.');
            expect(actual).toBe(true);
        });
    });

    describe('with no commit message', () => {
        let client = null;
        let logger = null;

        beforeEach(async() => {
            await initCardsFile({ 'test/resources/test_card_unchanged.md': 'unchanged123' });

            client = createClient({
                getCardResult: { id: 'unchanged123' }
            });

            logger = arrayLogger();

            await action({
                logger,
                client,
                github: {
                    commit: {
                        message: null
                    }
                },
                inputs: {
                    collectionId: 'c123',
                    cards: { 'test/resources/test_card_unchanged.md': 'unchanged123' },
                }
            });
        });

        it('skips unchanged123', () => {
            const actual = client.getCalls().some((call) => 
                call.type === 'updateCard' &&
                call.id === 'unchanged123'
            );
            expect(actual).toBe(false);
        });

        it('emits a log notice', () => {
            const actual = logger.getMessages().some(msg => msg === 'We were unable to read the latest commit message. Any commit flags will be ignored.');
            expect(actual).toBe(true);
        });
    });

    describe('with [guru update] flag', () => {
        let client = null;
        let expectedContent = null;
        let logger = null;

        beforeEach(async() => {
            await initCardsFile({ 'test/resources/test_card_unchanged.md': 'unchanged123' });

            client = createClient({
                getCardResult: { id: 'unchanged123' }
            });

            logger = arrayLogger();

            expectedContent = await resource('test_card_with_footer_expected_output.html');

            await action({
                logger,
                client,
                github: {
                    commit: {
                        message: 'A Test Commit [guru update]\n\nSome more description.'
                    }
                },
                inputs: {
                    collectionId: 'c123',
                    cards: { 'test/resources/test_card_unchanged.md': 'unchanged123' },
                }
            });
        });

        it('updates the card, unchanged though it be', async() => {
            const call = client.getCalls().find((call) => 
                call.type === 'updateCard' &&
                call.id === 'unchanged123'
            );
            expect(call).toBeTruthy();
            expect(call.options.body.content).toBe(expectedContent);
        });

        it('emits a log notice', () => {
            const actual = logger.getMessages().some(msg => msg.includes('[guru update] flag detected. All cards will be updated.'));
            expect(actual).toBe(true);
        });
    });

    describe('with git object error', () => {
        let client = null;
        let expectedContent = null;
        let logger = null;

        beforeEach(async() => {
            await initCardsFile({ 'test/resources/test_card_unchanged.md': 'unchanged123' });

            client = createClient({
                getCardResult: { id: 'unchanged123' }
            });

            logger = arrayLogger();

            expectedContent = await resource('test_card_with_footer_expected_output.html');

            await action({
                logger,
                client,
                getChangedFiles: () => {
                    throw new InvalidGitObjectError(); 
                },
                inputs: {
                    collectionId: 'c123',
                    cards: { 'test/resources/test_card_unchanged.md': 'unchanged123' },
                }
            });
        });

        it('updates the card, unchanged though it be', async() => {
            const call = client.getCalls().find((call) => 
                call.type === 'updateCard' &&
                call.id === 'unchanged123'
            );
            expect(call).toBeTruthy();
            expect(call.options.body.content).toBe(expectedContent);
        });

        it('emits a log notice', () => {
            const actual = logger.getMessages().some(msg => msg === 'The Git command used to determine which files have changed reported an invalid object error. Most likely, you forgot to include `fetch-depth` in your checkout action. All cards will be updated.');
            expect(actual).toBe(true);
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
                        cards: {
                            'test/resources/test_card_with_local_image.md': 'Test 123',
                        },
                        cardFooter: false
                    },
                    github: { repo: { isPublic: true } },
                });
            });

            it('rewrites the URLs to GitHub', async() => {
                expect(client.getCalls()[1].options.body.content).toBe(
                    await resource('test_card_with_github_urls_image_expected_output.html')
                );
            });
        });

        describe('with private repo', () => {
            let client = null;

            beforeEach(async() => {
                client = createClient({
                    createCardResult: { id: '123' },
                    attachmentResult: {
                        link: 'image-link',
                        filename: 'somefile.png'
                    }
                });

                await action({
                    client,
                    inputs: {
                        collectionId: 'c123',
                        cards: {
                            'test/resources/test_card_with_local_image.md': 'Test 123',
                        },
                        cardFooter: false
                    },
                    github: { repo: { isPublic: false } },
                });
            });

            it('rewrites the URLs to GitHub', async() => {
                expect(client.getCalls()[2].options.body.content).toBe(
                    await resource('test_card_with_upload_image_expected_output.html')
                );
            });
        });
    });
});