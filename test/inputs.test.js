import { InvalidInputsError } from 'ae_actions';
import getInputsBase from '../src/core/inputs.js';
import nullLogger from './support/null_logger.js';

function getInputs(callback) {
    return getInputsBase(callback, { logger: nullLogger() });
}

function typicalInputs(collectionType) {
    if (collectionType === 'standard') {
        return {
            user_email: 'test@example.com',
            user_token: 'test123',
            collection_type: collectionType,
            cards: JSON.stringify({ }),
            collection_id: '123',
            board_id: '123',
            board_section_id: '123',
            github: JSON.stringify({ }),
            card_footer: 'Footer!',
            cards_file: 'something.json',
            image_handler: 'auto',
            update_all: 'true',
            ansi: 'false',
            debug_logging: 'false'
        };
    } else if (collectionType === 'synced') {
        return {
            user_email: 'test@example.com',
            user_token: 'test123',
            collection_type: collectionType,
            cards: JSON.stringify([ ]),
            collection_id: '123',
            github: JSON.stringify({ }),
            card_footer: 'Footer!',
            ansi: 'false',
            debug_logging: 'false'
        };
    }
}

describe('inputs.js', () => {
    describe('collection_type', () => {
        it('is required', () => {
            const f = () => getInputs(name => name === 'collection_type' ? '' : typicalInputs('synced')[name]).collectionType;
            expect(f).toThrow(InvalidInputsError);
            expect(f).toThrow(`"collection_type" is a required input!`);
        });

        test.each([
            ['standard'],
            ['synced']
        ])('with a valid option', (input) => {
            const actual = getInputs(name => name === 'collection_type' ? input : typicalInputs(input)[name]).collectionType;
            expect(actual).toBe(input);
        });

        test('with invalid option throws error', () => {
            const f = () => getInputs(name => name === 'collection_type' ? 'invalid' : typicalInputs('standard')[name]).collectionType;
            expect(f).toThrow(InvalidInputsError);
            expect(f).toThrow('"collection_type" must be one of [standard, synced]');
        });
    });

    describe.each([
        ['standard'],
        ['synced']
    ])('with either collection type', (type) => {
        function getInput(name) {
            return typicalInputs(type)[name];
        }

        test('user_email is required', () => {
            const f = () => {
                getInputs(name => name === 'user_email' ? '' : getInput(name));
            };
            expect(f).toThrow(InvalidInputsError);
            expect(f).toThrow('"user_email" is a required input!');
        });

        test('user_token is required', () => {
            const f = () => {
                getInputs(name => name === 'user_token' ? '' : getInput(name));
            };
            expect(f).toThrow(InvalidInputsError);
            expect(f).toThrow('"user_token" is a required input!');
        });

        test('collection_id is required', () => {
            const f = () => {
                getInputs(name => name === 'collection_id' ? '' : getInput(name));
            };
            expect(f).toThrow(InvalidInputsError);
            expect(f).toThrow('"collection_id" is a required input!');
        });

        test('card_footer is not required', () => {
            const actual = getInputs(name => name === 'card_footer' ? '' : getInput(name)).cardFooter;
            expect(actual).toBe(null);
        });

        describe('debugLogging', () => {
            test('is not required and has default', () => {
                const actual = getInputs(name => name === 'debug_logging' ? '' : getInput(name)).debugLogging;
                expect(actual).toBe(false);
            });

            test('with true', () => {
                const actual = getInputs(name => name === 'debug_logging' ? 'true' : getInput(name)).debugLogging;
                expect(actual).toBe(true);
            });

            test('with false', () => {
                const actual = getInputs(name => name === 'debug_logging' ? 'false' : getInput(name)).debugLogging;
                expect(actual).toBe(false);
            });

            test('with something else throws error', () => {
                const f = () => getInputs(name => name === 'debug_logging' ? 'invalid' : getInput(name)).debugLogging;
                expect(f).toThrow(InvalidInputsError);
            });
        });

        describe('ansi', () => {
            test('is not required and has default', () => {
                const actual = getInputs(name => name === 'ansi' ? '' : getInput(name)).ansi;
                expect(actual).toBe(true);
            });

            test('with true', () => {
                const actual = getInputs(name => name === 'ansi' ? 'true' : getInput(name)).ansi;
                expect(actual).toBe(true);
            });

            test('with false', () => {
                const actual = getInputs(name => name === 'ansi' ? 'false' : getInput(name)).ansi;
                expect(actual).toBe(false);
            });

            test('with something else throws error', () => {
                const f = () => getInputs(name => name === 'ansi' ? 'invalid' : getInput(name)).ansi;
                expect(f).toThrow(InvalidInputsError);
            });
        });

        describe('github', () => {
            test('is required', () => {
                const f = () => getInputs(name => name === 'github' ? '' : getInput(name));
                expect(f).toThrow(InvalidInputsError);
                expect(f).toThrow('"github" is a required input!');
            });

            test('with valid json parses', () => {
                const input = '{ "prop": true }';
                const actual = getInputs(name => name === 'github' ? input : getInput(name)).github;
                expect(actual).toStrictEqual({ prop: true });
            });

            test('with invalid json throws error', () => {
                const input = '{ prop: true }';
                const f = () => getInputs(name => name === 'github' ? input : getInput(name)).github;
                expect(f).toThrow(InvalidInputsError);
                expect(f).toThrow('"github" must be valid JSON!');
            });
        });
    });

    describe('with standard collection', () => {
        function getInput(name) {
            return typicalInputs('standard')[name];
        }

        test('returns object', () => {
            expect(getInputs(getInput)).toStrictEqual({
                userEmail: 'test@example.com',
                userToken: 'test123',
                collectionType: 'standard',
                cards: { },
                collectionId: '123',
                boardId: '123',
                boardSectionId: '123',
                github: {},
                cardFooter: 'Footer!',
                cardsFile: 'something.json',
                imageHandler: 'auto',
                updateAll: true,
                ansi: false,
                debugLogging: false
            });
        });

        test.each([
            ['', '"cards" is a required input!'],
            [null, '"cards" is a required input!'],
            ['invalid', '"cards" must be valid JSON!'],
            ['[]', '"cards" must be a valid JSON object, not an array!'] 
        ])('cards throws error if missing or invalid json', (value, message) => {
            const f = () => {
                getInputs(name => name === 'cards' ? value : getInput(name));
            };
            expect(f).toThrow(InvalidInputsError);
            expect(f).toThrow(message);
        });

        test('cards is correctly parsed if valid json', () => {
            const actual = getInputs(name => name === 'cards' ? '{ "key": "value" }' : getInput(name)).cards;
            expect(actual).toStrictEqual({
                key: 'value'
            });
        });

        test('board_id is not required', () => {
            const actual = getInputs(name => name === 'board_id' ? '' : getInput(name)).boardId;
            expect(actual).toBe(null);
        });

        test('board_section_id is not required', () => {
            const actual = getInputs(name => name === 'board_section_id' ? '' : getInput(name)).boardSectionId;
            expect(actual).toBe(null);
        });

        test('cards_file is not required and has default', () => {
            const actual = getInputs(name => name === 'cards_file' ? '' : getInput(name)).cardsFile;
            expect(actual).toBe('uploaded-guru-cards.json');
        });

        describe('imageHandler', () => {
            test('is not required and has default', () => {
                const actual = getInputs(name => name === 'image_handler' ? '' : getInput(name)).imageHandler;
                expect(actual).toBe('auto');
            });

            test.each([
                ['auto'],
                ['github_urls'],
                ['upload']
            ])('with a valid option', (input) => {
                const actual = getInputs(name => name === 'image_handler' ? input : getInput(name)).imageHandler;
                expect(actual).toBe(input);
            });

            test('with invalid option throws error', () => {
                const f = () => getInputs(name => name === 'image_handler' ? 'invalid' : getInput(name));
                expect(f).toThrow(InvalidInputsError);
                expect(f).toThrow('"image_handler" must be one of [auto, github_urls, upload]');
            });
        });
    });

    describe('with synced collection', () => {
        function getInput(name) {
            return typicalInputs('synced')[name];
        }

        test.each([
            ['', '"cards" is a required input!'],
            [null, '"cards" is a required input!'],
            ['invalid', '"cards" must be valid JSON!'],
            ['{}', '"cards" must be a valid JSON array, not an object!'],
            ['[ "valid", {} ]', '"cards" element 2 has no glob!']
        ])('cards throws error if missing or invalid', (value, message) => {
            const f = () => {
                getInputs(name => name === 'cards' ? value : getInput(name));
            };
            expect(f).toThrow(InvalidInputsError);
            expect(f).toThrow(message);
        });

        test('cards is correctly parsed if valid json', () => {
            const actual = getInputs(name => name === 'cards' ? '[ "one", { "glob": "value" } ]' : getInput(name)).cards;
            expect(actual).toStrictEqual([
                'one',
                {
                    glob: 'value'
                }
            ]);
        });
    });
});