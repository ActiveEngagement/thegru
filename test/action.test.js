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
    options.repositoryUrl ||= 'https://example.com';
    options.commitCardsFile ||= () => { };

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
                'test/resources/test_card_3.md': 'Test 789',
                'test/resources/test_card_2.md': 'Test 456',
            },
            logger
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
        expect(JSON.parse(await readFile('test/env/uploaded-cards.json'))).toStrictEqual({
            'test/resources/test_card.md': '123',
            'test/resources/test_card_3.md': '789',
            'test/resources/test_card_2.md': '456'
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