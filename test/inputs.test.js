import { InvalidInputsError } from 'ae_actions';
import getInputsBase from '../src/core/inputs.js';
import nullLogger from './support/null_logger.js';
import * as verbosities from '../src/core/verbosities.js';

function getInputs(callback) {
    return getInputsBase(callback, { logger: nullLogger() });
}

function typicalInputs(collectionType) {
    if(collectionType === 'standard') {
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
            attachment_handler: 'auto',
            update_all: 'true',
            ansi: 'false',
            verbosity: 'warning'
        };
    }
    else if(collectionType === 'synced') {
        return {
            user_email: 'test@example.com',
            user_token: 'test123',
            collection_type: collectionType,
            cards: JSON.stringify([ ]),
            collection_id: '123',
            github: JSON.stringify({ }),
            card_footer: 'Footer!',
            prefer_sections: 'false',
            ansi: 'false',
            verbosity: 'warning'
        };
    }
}

describe('inputs.js', () => {
    describe('collection_type', () => {
        it('is required', () => {
            const f = () => getInputs(name => name === 'collection_type' ? '' : typicalInputs('synced')[name]).collectionType;
            expect(f).toThrow(InvalidInputsError);
            expect(f).toThrow('"collection_type" is a required input!');
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

        describe('verbosity', () => {
            test('is not required and has default', () => {
                const actual = getInputs(name => name === 'verbosity' ? '' : getInput(name)).verbosity;
                expect(actual).toBe(verbosities.INFO);
            });

            test.each([
                verbosities.verbosities()
            ])('with a valid option', (v) => {
                const actual = getInputs(name => name === 'verbosity' ? verbosities.name(v) : getInput(name)).verbosity;
                expect(actual).toBe(v);
            });

            test('with invalid option throws error', () => {
                const f = () => getInputs(name => name === 'verbosity' ? 'invalid' : getInput(name));
                expect(f).toThrow(InvalidInputsError);
                expect(f).toThrow('"verbosity" must be one of [silent, error, notice, warning, info, debug, trace]');
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

        describe('attachmentHandler', () => {
            test('is not required and has default', () => {
                const actual = getInputs(name => name === 'attachment_handler' ? '' : getInput(name)).attachmentHandler;
                expect(actual).toBe('auto');
            });

            test.each([
                ['auto'],
                ['github_urls'],
                ['upload']
            ])('with a valid option', (input) => {
                const actual = getInputs(name => name === 'attachment_handler' ? input : getInput(name)).attachmentHandler;
                expect(actual).toBe(input);
            });

            test('with invalid option throws error', () => {
                const f = () => getInputs(name => name === 'attachment_handler' ? 'invalid' : getInput(name));
                expect(f).toThrow(InvalidInputsError);
                expect(f).toThrow('"attachment_handler" must be one of [auto, github_urls, upload]');
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
                attachmentHandler: 'auto',
                updateAll: true,
                ansi: false,
                verbosity: verbosities.WARNING
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

        describe('preferred_container', () => {
            test('is not required and has default', () => {
                const actual = getInputs(name => name === 'preferred_container' ? '' : getInput(name)).preferredContainer;
                expect(actual).toBe('board_group');
            });

            test.each([
                ['board_group'],
                ['board']
            ])('with a valid option', (input) => {
                const actual = getInputs(name => name === 'preferred_container' ? input : getInput(name)).preferredContainer;
                expect(actual).toBe(input);
            });

            test('with invalid option throws error', () => {
                const f = () => getInputs(name => name === 'preferred_container' ? 'invalid' : getInput(name));
                expect(f).toThrow(InvalidInputsError);
                expect(f).toThrow('"preferred_container" must be one of [board_group, board, board_section]');
            });

            test('with board_section throws appropriate error', () => {
                const f = () => getInputs(name => name === 'preferred_container' ? 'board_section': getInput(name));
                expect(f).toThrow(InvalidInputsError);
                expect(f).toThrow('"preferred_container" cannot be "board_section", because Guru sections are only permitted beneath boards. You should change the preferred container type to "board" and set "rootContainer" in the card rule.');
            });
        });
    });
});