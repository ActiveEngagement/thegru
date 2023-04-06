import { InvalidContainerConfigurationError } from '../../src/core/error.js';
import typifyBase from '../../src/core/synced/tree/typify.js';
import * as types from '../../src/core/synced/container_types.js';
import { card, container, traversePath as evaluatePath, root } from '../../src/core/synced/tree/util.js';
import nullLogger from '../support/null_logger.js';

function typify(tree, options = {}) {
    options.preferredContainer ||= types.name(types.BOARD_GROUP);
    options.logger ||= nullLogger();

    return typifyBase(tree, options);
}

describe('typify_tree.js', () => {
    describe('with empty tree', () => {
        describe.each([
            types.types().map(t => [t])
        ])('with any preferred type', (preferred) => {
            it('does nothing', () => {
                const tree = root();
                typify(tree, {
                    preferredContainer: types.name(preferred)
                });
                expect(tree).toStrictEqual(root());
            });
        });
    });

    describe('with preferred type board_section', () => {
        it('throws an error', () => {
            const f = () => typify(root(), { preferredContainer: types.name(types.BOARD_SECTION) });
            expect(f).toThrow(InvalidContainerConfigurationError);
        });
    });

    describe('with too-deep tree', () => {
        it('throws an error', () => {
            const tree = root({
                one: container({
                    child: card()
                }),
                two: container({
                    nested: container({
                        very: container({
                            deeply: container()
                        })
                    })
                })
            });
            const f = () => typify(tree);
            expect(f).toThrow(InvalidContainerConfigurationError);
            expect(f).toThrow('The configured container "two/nested/very/deeply" is too deep! Guru does not support more than 3 organizational levels.');
        });
    });

    describe('with 3-level tree with top-level cards', () => {
        it('throws an error', () => {
            const tree = root({
                one: container({
                    child: card()
                }),
                two: container({
                    top: card(),
                    nested: container({
                        deeply: container({
                            child: card()
                        })
                    })
                })
            });
            const f = () => typify(tree);
            expect(f).toThrow(InvalidContainerConfigurationError);
            expect(f).toThrow('The configured container "two" cannot contain the card "two/top"! Because the configured container structure is 3 levels deep, "two/top" would need to be a Guru board group, which cannot contain cards directly.');
        });
    });

    describe('with 3-level tree with top-level cards in another branch', () => {
        it.each([
            [types.BOARD_GROUP],
            [types.BOARD]
        ])('typifies each correctly', (preferred) => {
            const tree = root({
                one: container({
                    child: card()
                }),
                two: container({
                    nested: container({
                        deeply: container({
                            child: card()
                        })
                    })
                })
            });

            typify(tree, { preferredContainer: types.name(preferred) });

            expect(evaluatePath(tree, 'one').containerType).toBe(types.BOARD);
            expect(evaluatePath(tree, 'two').containerType).toBe(types.BOARD_GROUP);
            expect(evaluatePath(tree, 'two/nested').containerType).toBe(types.BOARD);
            expect(evaluatePath(tree, 'two/nested/deeply').containerType).toBe(types.BOARD_SECTION);
        });
    });

    it('leaves other properties alone', () => {
        const tree = root({
            one: card({ title: 'test' }),
            two: card(),
            dir: container({
                three: card()
            })
        });

        const containerObj = container({
            three: card()
        });
        containerObj.containerType = types.BOARD;
        const expected = root({
            one: card({ title: 'test' }),
            two: card(),
            dir: containerObj
        });

        typify(tree);

        expect(tree).toStrictEqual(expected);
    });

    test.each([
        [types.BOARD_GROUP],
        [types.BOARD]
    ])('a typical scenario', (preferred) => {
        const tree = root({
            i: card(),
            I: container({
                A: container({
                    ALPHA: container({
                        one: card(),
                        two: card()
                    }),
                    BETA: container({
                        one: card()
                    }),
                    alpha: card()
                }),
                B: container(),
                C: container({
                    alpha: card()
                })
            }),
            ii: card(),
            II: container({
                a: card(),
                b: card(),
                c: card(),
                A: container()
            }),
            III: container(),
            IV: container({
                A: container(),
                B: container({
                    a: card(),
                    b: card()
                })
            })
        });

        typify(tree, { preferredContainer: types.name(preferred) });

        expect(evaluatePath(tree, 'I').containerType).toBe(types.BOARD_GROUP);
        expect(evaluatePath(tree, 'I/A').containerType).toBe(types.BOARD);
        expect(evaluatePath(tree, 'I/A/ALPHA').containerType).toBe(types.BOARD_SECTION);
        expect(evaluatePath(tree, 'I/A/BETA').containerType).toBe(types.BOARD_SECTION);
        expect(evaluatePath(tree, 'I/B').containerType).toBe(types.BOARD);
        expect(evaluatePath(tree, 'I/C').containerType).toBe(types.BOARD);

        expect(evaluatePath(tree, 'II').containerType).toBe(types.BOARD);
        expect(evaluatePath(tree, 'II/A').containerType).toBe(types.BOARD_SECTION);

        expect(evaluatePath(tree, 'III').containerType).toBe(preferred);
        expect(evaluatePath(tree, 'IV').containerType).toBe(preferred);
        expect(evaluatePath(tree, 'IV/A').containerType).toBe(types.from(types.level, types.level(preferred) + 1));
        expect(evaluatePath(tree, 'IV/B').containerType).toBe(types.from(types.level, types.level(preferred) + 1));
    });
});