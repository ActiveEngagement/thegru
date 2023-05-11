import { InvalidInputsError } from 'ae_actions';
import getInputsBase from '../../../src/core/inputs.js';
import nullLogger from '../../support/null_logger.js';
import * as verbosities from '../../../src/core/verbosities.js';

function getInputs(callback) {
    return getInputsBase(callback, { logger: nullLogger() });
}

function getInputFromInputs(name, value, getInput) {
    const inputs = getInputs(n => n === name ? value : getInput(n));
    return inputs[snakeToCamel(name)];
}

function snakeToCamel(str) {
    return str.toLowerCase().replace(/([-_][a-z])/g, group =>
        group
            .toUpperCase()
            .replace('-', '')
            .replace('_', '')
    );
}

function typicalInputs(collectionType) {
    if(collectionType === 'standard') {
        return {
            user_email: 'test@example.com',
            user_token: 'test123',
            collection_type: collectionType,
            cards: JSON.stringify([ ]),
            collection_id: '123',
            board_id: '123',
            board_section_id: '123',
            github: JSON.stringify({ }),
            card_footer: 'Footer!',
            cards_file: 'something.json',
            attachment_handler: 'auto',
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
            verbosity: 'warning',
            attachment_handler: 'auto',
            containers: JSON.stringify({ test: {} }),
            preferred_container: 'board',
            dry_run: 'false'
        };
    }
}

describe('core/inputs.js', () => {
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

        describe('user_email', () => {
            const name = 'user_email';
            
            it('is required', () => {
                const f = () => getInputFromInputs(name, '', getInput);
                expect(f).toThrow(InvalidInputsError);
                expect(f).toThrow(`"${name}" is a required input!`);
            })
        });

        describe('user_token', () => {
            const name = 'user_token';
            
            it('is required', () => {
                const f = () => getInputFromInputs(name, '', getInput);
                expect(f).toThrow(InvalidInputsError);
                expect(f).toThrow(`"${name}" is a required input!`);
            })
        });

        describe('collection_id', () => {
            const name = 'collection_id';
            
            it('is required', () => {
                const f = () => getInputFromInputs(name, '', getInput);
                expect(f).toThrow(InvalidInputsError);
                expect(f).toThrow(`"${name}" is a required input!`);
            })
        });

        describe('github', () => {
            const name = 'github';

            it('is required', () => {
                const f = () => getInputFromInputs(name, '', getInput);
                expect(f).toThrow(InvalidInputsError);
                expect(f).toThrow(`"${name}" is a required input!`);
            })

            it('parses valid json', () => {
                const actual = getInputFromInputs(name, '{ "prop": true }', getInput);
                expect(actual).toStrictEqual({ prop: true });
            });

            it('throws error for invalid json', () => {
                const f = () => getInputFromInputs(name, 'invalid', getInput);
                expect(f).toThrow(InvalidInputsError);
                expect(f).toThrow(`"${name}" must be valid JSON!`);
            });
        });

        describe('card_footer', () => {
            const name = 'card_footer';

            it('is not required', () => {
                const actual = getInputFromInputs(name, '', getInput);
                expect(actual).toBe(null);
            })
            
            it.each([
                [true],
                [false]
            ])('parses boolean values', value => {
                const actual = getInputFromInputs(name, value, getInput);
                expect(actual).toBe(value);
            })

            it.each([
                ['<a href="google.com">Click here</a>'],
                [null]
            ])('leaves other values alone', value => {
                const actual = getInputFromInputs(name, value, getInput);
                expect(actual).toBe(value);
            })
        })

        describe('ansi', () => {
            const name = 'ansi';

            it('is not required and has default', () => {
                const actual = getInputFromInputs(name, '', getInput);
                expect(actual).toBe(true);
            });

            it.each([
                ['true', true],
                ['false', false]
            ])('parses boolean values', (value, expected) => {
                const actual = getInputFromInputs(name, value, getInput);
                expect(actual).toBe(expected);
            })

            it('throws error for anything else', () => {
                const f = () => getInputFromInputs(name, 'invalid', getInput);
                expect(f).toThrow(InvalidInputsError);
                expect(f).toThrow(`"${name}" must be "true" or "false"!`);
            });
        });

        describe('verbosity', () => {
            const name = 'verbosity';

            it('is not required and has default', () => {
                const actual = getInputFromInputs(name, '', getInput);
                expect(actual).toBe(verbosities.INFO);
            });

            it.each(
                verbosities.verbosities().map(v => [v])
            )('with a valid option', (v) => {
                const actual = getInputFromInputs(name, verbosities.name(v), getInput);
                expect(actual).toBe(v);
            });

            it('throws error for anything else', () => {
                const f = () => getInputFromInputs(name, 'invalid', getInput);
                expect(f).toThrow(InvalidInputsError);
                expect(f).toThrow(`"${name}" must be one of [silent, error, notice, warning, info, debug, trace]`);
            });
        });

        describe('attachment_handler', () => {
            const name = 'attachment_handler';

            it('is not required and has default', () => {
                const actual = getInputFromInputs(name, '', getInput);
                expect(actual).toBe('auto');
            });

            it.each([
                ['auto'],
                ['github_urls'],
                ['upload']
            ])('allows valid options', (value) => {
                const actual = getInputFromInputs(name, value, getInput);
                expect(actual).toBe(value);
            });

            it('throws error for anything else', () => {
                const f = () => getInputFromInputs(name, 'invalid', getInput);
                expect(f).toThrow(InvalidInputsError);
                expect(f).toThrow(`"${name}" must be one of [auto, github_urls, upload]`);
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
                cards: [ ],
                collectionId: '123',
                boardId: '123',
                boardSectionId: '123',
                github: {},
                cardFooter: 'Footer!',
                cardsFile: 'something.json',
                attachmentHandler: 'auto',
                ansi: false,
                verbosity: verbosities.WARNING
            });
        });

        describe('cards', () => {
            const name = 'cards';

            it.each([
                ['', '"cards" is a required input!'],
                [null, '"cards" is a required input!'],
                ['invalid', '"cards" must be valid JSON!'],
                ['{}', '"cards" must be a valid JSON array, not an object!'] 
            ])('throws error for empty or invalid json', (value, message) => {
                const f = () => getInputFromInputs(name, value, getInput);
                expect(f).toThrow(InvalidInputsError);
                expect(f).toThrow(message);
            });

            it('throws error for missing path', () => {
                const f = () => getInputFromInputs(name, '[{ "key": "one123" }]', getInput);
                expect(f).toThrow(InvalidInputsError);
                expect(f).toThrow(`"${name}" element 1 has no path!`);
            })

            it('correctly parses valid json', () => {
                const actual = getInputFromInputs(name, '["key", "value"]', getInput);
                expect(actual).toStrictEqual([
                    'key',
                    'value'
                ]);
            });
        });

        describe('board_id', () => {
            const name = 'board_id';

            it('is not required', () => {
                const actual = getInputFromInputs(name, '', getInput);
                expect(actual).toBe(null);
            });
        })

        describe('board_section_id', () => {
            const name = 'board_section_id';

            it('is not required', () => {
                const actual = getInputFromInputs(name, '', getInput);
                expect(actual).toBe(null);
            });
        });

        describe('cards_file', () => {
            const name = 'cards_file';

            it('is not required and has default', () => {
                const actual = getInputFromInputs(name, '', getInput);
                expect(actual).toBe('uploaded-guru-cards.json');
            })

            it('uses default for true', () => {
                const actual = getInputFromInputs(name, 'true', getInput);
                expect(actual).toBe('uploaded-guru-cards.json');
            })

            it('parses false', () => {
                const actual = getInputFromInputs(name, 'false', getInput);
                expect(actual).toBe(false);
            })

            it('ignores anything else', () => {
                const actual = getInputFromInputs(name, 'some-random-value', getInput);
                expect(actual).toBe('some-random-value');
            })
        })
    });

    describe('with synced collection', () => {
        function getInput(name) {
            return typicalInputs('synced')[name];
        }

        describe('cards', () => {
            const name = 'cards';

            it.each([
                ['', `"${name}" is a required input!`],
                [null, `"${name}" is a required input!`],
                ['invalid', `"${name}" must be valid JSON!`],
                ['{}', `"${name}" must be a valid JSON array, not an object!`] 
            ])('throws error for empty or invalid json', (value, message) => {
                const f = () => getInputFromInputs(name, value, getInput);
                expect(f).toThrow(InvalidInputsError);
                expect(f).toThrow(message);
            });

            it('throws error for missing glob', () => {
                const f = () => getInputFromInputs(name, '[{ "glob": "good" }, { "key": "one123" }]', getInput);
                expect(f).toThrow(InvalidInputsError);
                expect(f).toThrow(`"${name}" element 2 has no glob!`);
            })

            it('correctly parses valid json', () => {
                const actual = getInputFromInputs(name, '["key", "value"]', getInput);
                expect(actual).toStrictEqual([
                    'key',
                    'value'
                ]);
            });
        });

        describe('containers', () => {
            const name = 'containers';

            it('is not required and has default', () => {
                const actual = getInputFromInputs(name, '', getInput);
                expect(actual).toStrictEqual({ });
            })

            it.each([
                ['invalid', `"${name}" must be valid JSON!`],
                ['[]', `"${name}" must be a valid JSON object, not an array!`] 
            ])('throws error for empty or invalid json', (value, message) => {
                const f = () => getInputFromInputs(name, value, getInput);
                expect(f).toThrow(InvalidInputsError);
                expect(f).toThrow(message);
            });

            it('correctly parses valid json', () => {
                const actual = getInputFromInputs(name, '{"key": "value"}', getInput);
                expect(actual).toStrictEqual({
                    key: 'value'
                });
            });
        });

        describe('preferred_container', () => {
            const name = 'preferred_container';

            it('is not required and has default', () => {
                const actual = getInputFromInputs(name, '', getInput);
                expect(actual).toBe('board_group');
            });

            it.each([
                ['board_group'],
                ['board']
            ])('allows valid options', (value) => {
                const actual = getInputFromInputs(name, value, getInput);
                expect(actual).toBe(value);
            });

            it('throws error for invalid option', () => {
                const f = () => getInputFromInputs(name, 'invalid', getInput);
                expect(f).toThrow(InvalidInputsError);
                expect(f).toThrow(`"${name}" must be one of [board_group, board, board_section]`);
            });

            test('throws appropriate error for board_section', () => {
                const f = () => getInputFromInputs(name, 'board_section', getInput);
                expect(f).toThrow(InvalidInputsError);
                expect(f).toThrow('"preferred_container" cannot be "board_section", because Guru sections are only permitted beneath boards. You should change the preferred container type to "board" and set "rootContainer" in the card rule.');
            });
        });

        describe('dry_run', () => {
            const name = 'dry_run';

            it('is not required and has default', () => {
                const actual = getInputFromInputs(name, '', getInput);
                expect(actual).toBe(false);
            });

            it.each([
                ['true', true],
                ['false', false]
            ])('parses boolean values', (value, expected) => {
                const actual = getInputFromInputs(name, value, getInput);
                expect(actual).toBe(expected);
            })

            it('throws error for anything else', () => {
                const f = () => getInputFromInputs(name, 'invalid', getInput);
                expect(f).toThrow(InvalidInputsError);
                expect(f).toThrow(`"${name}" must be "true" or "false"!`);
            });
        });
    });
});