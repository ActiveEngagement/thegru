import buildTreeBase from '../../src/core/synced/build_tree.js';
import nullLogger from '../support/null_logger.js';
import arrayLogger from '../support/array_logger.js';
import env from '../support/env.js';
import { card as cardBase, container, root } from '../../src/core/synced/tree_util.js';

function card(options = {}) {
    return cardBase(options);
}

function cardTree(rules, options = {}) {
    options.logger ||= nullLogger();

    return buildTreeBase(rules, options);
}

describe('build_tree.js', () => {
    beforeEach(async() => {
        await env({
            some: { direct: {
                'card.md': '# Test\n'
            } },
            dir: {
                one: {
                    'test.md': '# Test\n',
                    'test2.md': '# Test\n',
                },
                two: {
                    'test3.md': '# Test\n'
                }
            },
            unrelated: { do: { not: { touch: {
                'test4.md': '# Test\n'
            } } } },
            'test5.md': '# Test\n'
        });

        process.chdir('test/env');
    });

    afterEach(() => {
        process.chdir('../..');
    });

    test('with no rules', () => {
        expect(cardTree([])).toStrictEqual(root());
    });
    
    test('with basic globs and explicit container paths', () => {
        const actual = cardTree([
            {
                glob: 'some/direct/card.md',
                container: 'someboard',
                title: 'Test'
            },
            {
                glob: 'dir/*/*.md',
                container: 'someboard/child'
            },
            {
                glob: 'test5.md',
                container: null,
                externalUrl: 'https://example.com'
            }
        ]);

        expect(actual).toStrictEqual(root({
            someboard: container({
                'card.md': card({
                    title: 'Test',
                    file: 'some/direct/card.md'
                }),
                child: container({
                    'test.md': card({ file: 'dir/one/test.md' }),
                    'test2.md': card({ file: 'dir/one/test2.md' }),
                    'test3.md': card({
                        file: 'dir/two/test3.md',
                        title: null
                    })
                }, { file: null })
            }),
            'test5.md': card({
                file: 'test5.md',
                title: null,
                externalUrl: 'https://example.com'
            })
        }));
    });

    test('with inferred container path but no roots', () => {
        const actual = cardTree([
            'some/direct/card.md',
            {
                glob: 'dir/*/*.md'
            },
            'test5.md'
        ]);

        expect(actual).toStrictEqual(root({
            some: container({
                direct: container({
                    'card.md': card({ file: 'some/direct/card.md' })
                }, { file: 'some/direct' })
            }, { file: 'some' }),
            dir: container({
                one: container({
                    'test.md': card({ file: 'dir/one/test.md' }),
                    'test2.md': card({ file: 'dir/one/test2.md' })
                }, { file: 'dir/one', }),
                two: container({
                    'test3.md': card({
                        file: 'dir/two/test3.md',
                        title: null
                    })
                }, { file: 'dir/two' })
            }, { file: 'dir' }),
            'test5.md': card({
                file: 'test5.md',
                externalUrl: null,
                title: null
            })
        }));
    });

    test('with inferred container path and root container', () => {
        const actual = cardTree([
            'some/direct/card.md',
            {
                glob: 'dir/*/*.md',
                rootContainer: 'top/another'
            }
        ]);

        expect(actual).toStrictEqual(root({
            some: container({
                direct: container({
                    'card.md': card({ file: 'some/direct/card.md' })
                }, { file: 'some/direct' })
            }, { file: 'some' }),
            top: container({
                another: container({
                    dir: container({
                        one: container({
                            'test.md': card({ file: 'dir/one/test.md'}),
                            'test2.md': card({ file: 'dir/one/test2.md' })
                        }, { file: 'dir/one' }),
                        two: container({
                            'test3.md': card({
                                file: 'dir/two/test3.md',
                                title: null
                            })
                        }, { file: 'dir/two' })
                    }, { file: 'dir' })
                }, { file: null })
            }, { file: null })
        }));
    });

    test('with inferred container path and simple root dir', () => {
        const actual = cardTree([
            'some/direct/card.md',
            {
                rootDir: 'dir/',
                glob: '*/*.md'
            }
        ]);

        expect(actual).toStrictEqual(root({
            some: container({
                direct: container({
                    'card.md': card({ file: 'some/direct/card.md' })
                }, { file: 'some/direct' })
            }, { file: 'some' }),
            one: container({
                'test.md': card({ file: 'dir/one/test.md' }),
                'test2.md': card({ file: 'dir/one/test2.md' })
            }, { file: 'dir/one' }),
            two: container({
                'test3.md': card({
                    file: 'dir/two/test3.md',
                    title: null
                })
            }, { file: 'dir/two' })
        }));
    });

    test('with glob root dir', () => {
        const actual = cardTree([
            {
                rootDir: '{dir,some}/',
                glob: '**/*.md'
            }
        ]);

        expect(actual).toStrictEqual(root({
            one: container({
                'test.md': card({ file: 'dir/one/test.md' }),
                'test2.md': card({ file: 'dir/one/test2.md' })
            }, { file: 'dir/one' }),
            two: container({
                'test3.md': card({
                    file: 'dir/two/test3.md',
                    title: null
                })
            }, { file: 'dir/two' }),
            direct: container({
                'card.md': card({ file: 'some/direct/card.md' })
            }, { file: 'some/direct' })
        }));
    });

    describe('with glob root dir without trailing slash', () => {
        let logger = null;
        let actual = null;

        beforeEach(() => {
            logger = arrayLogger();

            actual = cardTree([
                {
                    rootDir: '*',
                    glob: '*/*.md'
                }
            ], { logger });
        });

        it('builds the proper tree', () => {
            expect(actual).toStrictEqual(root({
                one: container({
                    'test.md': card({ file: 'dir/one/test.md' }),
                    'test2.md': card({ file: 'dir/one/test2.md' })
                }, { file: 'dir/one' }),
                two: container({
                    'test3.md': card({
                        file: 'dir/two/test3.md',
                        title: null
                    })
                }, { file: 'dir/two' }),
                direct: container({
                    'card.md': card({ file: 'some/direct/card.md' })
                }, { file: 'some/direct' })
            }));
        });

        it('emits an appropriate log message', () => {
            expect(logger.getMessages()).toStrictEqual([
                'Card rule rootDir "*" does not end with a "/". This was probably an accident, so we will append one.'
            ]);
        });
    });


    test('altogether now', () => {
        const actual = cardTree([
            {
                glob: '*.md',
                title: 'README',
                rootContainer: null
            },
            {
                rootDir: '{dir,some}/',
                glob: '**/*.md',
                rootContainer: 'top'
            }
        ]);

        expect(actual).toStrictEqual(root({
            'test5.md': card({
                title: 'README',
                file: 'test5.md'
            }),
            top: container({
                one: container({
                    'test.md': card({ file: 'dir/one/test.md'}),
                    'test2.md': card({ file: 'dir/one/test2.md' })
                }, { file: 'dir/one' }),
                two: container({
                    'test3.md': card({
                        file: 'dir/two/test3.md',
                        title: null
                    })
                }, { file: 'dir/two' }),
                direct: container({
                    'card.md': card({ file: 'some/direct/card.md'})
                }, { file: 'some/direct' })
            }, { file: null })
        }));
    });
});