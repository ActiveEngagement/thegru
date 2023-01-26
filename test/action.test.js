import runAction from '../src/action.js';
import createClient from './support/api_client.js';
import { resource } from './support/util.js';
import fs from 'fs';
import { readFile, writeFile } from '../src/fs_util.js';
import arrayLogger from './support/array_logger.js';
import nullLogger from './support/null_logger.js';

beforeEach(async() => {
    if(fs.existsSync('test/env')) {
        await fs.promises.rm('test/env', { recursive: true });
    }
    await fs.promises.mkdir('test/env');
});

async function initCardsFile(data) {

    await writeFile('test/env/uploaded-cards.json', JSON.stringify(data));
}

async function action(options) {
    options.logger ||= nullLogger();
    options.cardsFile ||= 'test/env/uploaded-cards.json';
    options.defaultCardFooter ||= '<{{repository_url}}>';
    options.github ||= {};
    options.github.repositoryUrl ||= 'https://example.com';
    options.github.repositoryName ||= 'ActiveEngagement/test';
    options.github.sha ||= '1234567890';
    if(options.github.commitMessage === undefined) {
        options.github.commitMessage = ' ';
    }
    if(options.github.isPublic === undefined) {
        options.github.isPublic = false;
    }
    options.imageHandler ||= 'auto';
    options.commitCardsFile ||= () => { };
    options.getChangedFiles ||= () => [];

    return await runAction(options);
}

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
            client,
            commitCardsFile: options => gitCall = options,
            collectionId: 'c123',
            cards: {
                'test/resources/test_card.md': 'Test 123',
                'test/resources/test_card_unchanged.md': 'unchanged123',
                'test/resources/test_card_3.md': 'Test 789',
                'test/resources/test_card_2.md': 'Test 456',
            },
            logger,
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
            collectionId: 'c123',
            cards: {
                'test/resources/test_card.md': 'Test 123',
                'test/resources/test_card_3.md': 'Test 789',
                'test/resources/test_card_2.md': 'Test 456',
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

    beforeEach(async() => {
        await initCardsFile({ 'test/resources/test_card_unchanged.md': 'unchanged123' });

        client = createClient({
            getCardResult: { id: 'unchanged123' }
        });

        logger = arrayLogger();

        expectedContent = await resource('test_card_with_footer_expected_output.html');

        await action({
            client,
            commitCardsFile: options => gitCall = options,
            collectionId: 'c123',
            cards: { 'test/resources/test_card_unchanged.md': 'unchanged123' },
            logger,
            updateAll: true
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
    })
})

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
            client,
            commitCardsFile: options => gitCall = options,
            collectionId: 'c123',
            cards: { 'test/resources/test_card_unchanged.md': 'unchanged123' },
            logger,
            github: {
                commitMessage: null
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
    })
})

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
            client,
            commitCardsFile: options => gitCall = options,
            collectionId: 'c123',
            cards: { 'test/resources/test_card_unchanged.md': 'unchanged123' },
            logger,
            github: {
                commitMessage: 'A Test Commit [guru update]\n\nSome more description.'
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
        const actual = logger.getMessages().some(msg => msg.includes('Since [guru update] was included in the commit, all cards will be updated.'));
        expect(actual).toBe(true);
    })
})

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
            client,
            commitCardsFile: options => gitCall = options,
            collectionId: 'c123',
            cards: { 'test/resources/test_card_unchanged.md': 'unchanged123' },
            logger,
            getChangedFiles: () => null
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
        const actual = logger.getMessages().some(msg => msg === 'We were unable to determine which Markdown files have changed due to a Git error. Most likely, you forgot to include `fetch-depth: 0` in your checkout action. All cards will be updated.');
        expect(actual).toBe(true);
    })
})