import fs from 'fs';
import cardsBase from '../../src/core/synced/cards.js';
import nullLogger from '../support/null_logger.js';
import arrayLogger from '../support/array_logger.js';
import env from '../support/env.js';

function cards(rules, options = {}) {
    options.logger ||= nullLogger();

    return cardsBase(rules, options);
}

describe('cards.js', () => {
    beforeEach(async() => {
        await env();

        process.chdir('test/env');

        fs.mkdirSync('some/direct', { recursive: true });
        fs.mkdirSync('dir');
        fs.mkdirSync('dir/one');
        fs.mkdirSync('dir/two');
        fs.mkdirSync('unrelated/do/not/touch', { recursive: true });

        fs.writeFileSync('some/direct/card.md', '# Test\n');
        fs.writeFileSync('dir/one/test.md', '# Test\n');
        fs.writeFileSync('dir/one/test2.md', '# Test\n');
        fs.writeFileSync('dir/two/test3.md', '# Test\n');
        fs.writeFileSync('unrelated/do/not/touch/test4.md', '# Test\n');
        fs.writeFileSync('test5.md', '# Test\n');
    });

    afterEach(() => {
        process.chdir('../..');
    });

    test('with no rules', () => {
        expect(cards([])).toStrictEqual([]);
    });
    
    test('with basic globs and explicit board paths', () => {
        const actual = cards([
            {
                glob: 'some/direct/card.md',
                board: 'someboard',
                title: 'Test'
            },
            {
                glob: 'dir/*/*.md',
                board: 'someboard/child'
            },
            {
                glob: 'test5.md',
                board: null
            }
        ]);

        expect(actual).toStrictEqual([
            {
                path: 'some/direct/card.md',
                board: 'someboard',
                title: 'Test'
            },
            {
                path: 'dir/one/test.md',
                board: 'someboard/child',
                title: null
            },
            {
                path: 'dir/one/test2.md',
                board: 'someboard/child',
                title: null
            },
            {
                path: 'dir/two/test3.md',
                board: 'someboard/child',
                title: null
            },
            {
                path: 'test5.md',
                board: null,
                title: null
            }
        ]);
    });

    test('with inferred board path but no roots', () => {
        const actual = cards([
            'some/direct/card.md',
            {
                glob: 'dir/*/*.md'
            },
            'test5.md'
        ]);

        expect(actual).toStrictEqual([
            {
                path: 'some/direct/card.md',
                board: 'some/direct',
                title: null
            },
            {
                path: 'dir/one/test.md',
                board: 'dir/one',
                title: null
            },
            {
                path: 'dir/one/test2.md',
                board: 'dir/one',
                title: null
            },
            {
                path: 'dir/two/test3.md',
                board: 'dir/two',
                title: null
            },
            {
                path: 'test5.md',
                board: null,
                title: null
            }
        ]);
    });

    test('with inferred board path and root board', () => {
        const actual = cards([
            'some/direct/card.md',
            {
                glob: 'dir/*/*.md',
                rootBoard: 'top/another'
            }
        ]);

        expect(actual).toStrictEqual([
            {
                path: 'some/direct/card.md',
                board: 'some/direct',
                title: null
            },
            {
                path: 'dir/one/test.md',
                board: 'top/another/dir/one',
                title: null
            },
            {
                path: 'dir/one/test2.md',
                board: 'top/another/dir/one',
                title: null
            },
            {
                path: 'dir/two/test3.md',
                board: 'top/another/dir/two',
                title: null
            }
        ]);
    });

    test('with inferred board path and simple root dir', () => {
        const actual = cards([
            'some/direct/card.md',
            {
                rootDir: 'dir/',
                glob: '*/*.md'
            }
        ]);

        expect(actual).toStrictEqual([
            {
                path: 'some/direct/card.md',
                board: 'some/direct',
                title: null
            },
            {
                path: 'dir/one/test.md',
                board: 'one',
                title: null
            },
            {
                path: 'dir/one/test2.md',
                board: 'one',
                title: null
            },
            {
                path: 'dir/two/test3.md',
                board: 'two',
                title: null
            }
        ]);
    });

    test('with glob root dir', () => {
        const actual = cards([
            {
                rootDir: '{dir,some}/',
                glob: '**/*.md'
            }
        ]);

        expect(actual).toStrictEqual([
            {
                path: 'dir/one/test.md',
                board: 'one',
                title: null
            },
            {
                path: 'dir/one/test2.md',
                board: 'one',
                title: null
            },
            {
                path: 'dir/two/test3.md',
                board: 'two',
                title: null
            },
            {
                path: 'some/direct/card.md',
                board: 'direct',
                title: null
            },
        ]);
    });

    test('with glob root dir without trailing slash', () => {
        const logger = arrayLogger();

        const actual = cards([
            {
                rootDir: '*',
                glob: '*/*.md'
            }
        ], { logger });

        expect(actual).toStrictEqual([
            {
                path: 'dir/one/test.md',
                board: 'one',
                title: null
            },
            {
                path: 'dir/one/test2.md',
                board: 'one',
                title: null
            },
            {
                path: 'dir/two/test3.md',
                board: 'two',
                title: null
            },
            {
                path: 'some/direct/card.md',
                board: 'direct',
                title: null
            }
        ]);

        expect(logger.getMessages()).toStrictEqual([
            'Card rule rootDir "*" does not end with a "/". This was probably an accident, so we will append one.'
        ]);
    });


    test('altogether now', () => {
        const actual = cards([
            {
                glob: '*.md',
                title: 'README',
                rootBoard: null
            },
            {
                rootDir: '{dir,some}/',
                glob: '**/*.md',
                rootBoard: 'top'
            }
        ]);

        expect(actual).toStrictEqual([
            {
                path: 'test5.md',
                board: null,
                title: 'README'
            },
            {
                path: 'dir/one/test.md',
                board: 'top/one',
                title: null
            },
            {
                path: 'dir/one/test2.md',
                board: 'top/one',
                title: null
            },
            {
                path: 'dir/two/test3.md',
                board: 'top/two',
                title: null
            },
            {
                path: 'some/direct/card.md',
                board: 'top/direct',
                title: null
            }
        ]);
    });
});