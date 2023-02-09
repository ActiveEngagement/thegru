import attempt from '../src/core/attempt.js';

class ErrorOne extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
    }
}

class ErrorTwo extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
    }
}

class ErrorChild extends ErrorTwo {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
    }
}

describe('attempt do()', () => {
    function asynced(base) {
        return async(...args) => base(...args);
    }

    test('with no catch clauses', async() => {
        let ran = false;
        const result = await attempt()
            .do(asynced(() => {
                ran = true;
                return 'value';
            }));

        expect(ran).toBe(true);
        expect(result).toBe('value');
    });

    describe('catchAll clause', () => {
        test('with error-throwing callback', async() => {
            let actualE = null;

            const result = await attempt()
                .catchAll(asynced((e) => {
                    actualE = e;
                    return 'value';
                }))
                .do(asynced(() => {
                    throw new ErrorOne;
                }));

            expect(actualE instanceof ErrorOne).toBe(true);
            expect(result).toBe('value');
        });

        test('with non-error-throwing callback', async() => {
            let ran = false;

            const result = await attempt()
                .catchAll(asynced(() => 'caught'))
                .do(asynced(() => {
                    ran = true;
                    return 'value';
                }));

            expect(ran).toBe(true);
            expect(result).toBe('value');
        });
    });

    describe('catch clause', () => {
        describe('with error-throwing callback', () => {
            it('catches the specific exception', async() => {
                let actualE = null;

                const result = await attempt()
                    .catch(ErrorOne, () => 'caughtOne')
                    .catch(ErrorChild, () => 'caughtChild')
                    .catch(ErrorTwo, asynced((e) => {
                        actualE = e;
                        return 'caughtTwo';
                    }))
                    .catchAll(() => 'caughtAll')
                    .do(asynced(() => {
                        throw new ErrorTwo();
                    }));

                expect(result).toBe('caughtTwo');
                expect(actualE instanceof ErrorTwo).toBe(true);
            });

            it('catches a subclass', async() => {
                let actualE = null;

                const result = await attempt()
                    .catch(ErrorOne, () => 'caughtOne')
                    .catch(ErrorTwo, asynced((e) => {
                        actualE = e;
                        return 'caughtTwo';
                    }))
                    .catch(ErrorChild, () => 'caughtChild')
                    .catchAll(() => 'caughtAll')
                    .do(asynced(() => {
                        throw new ErrorChild();
                    }));

                expect(actualE instanceof ErrorChild).toBe(true);
                expect(result).toBe('caughtTwo');
            });

            it('throws an uncaught error', async() => {
                const f = async() => {
                    await attempt()
                        .catch(ErrorOne, () => 'caughtOne')
                        .do(asynced(() => {
                            throw new ErrorChild();
                        }));
                };

                expect(f)
                    .rejects
                    .toThrow(ErrorChild);
            });
        });

        test('with non-error-throwing callback', async() => {
            let ran = false;
            let catchRan = false;

            const result = await attempt()
                .catch(asynced(ErrorOne, () => catchRan = true))
                .catch(asynced(ErrorTwo, () => catchRan = true))
                .catch(asynced(ErrorChild, () => catchRan = true))
                .do(asynced(() => {
                    ran = true;
                    return 'value';
                }));

            expect(ran).toBe(true);
            expect(result).toBe('value');
        });
    });
});

describe('attempt doSync()', () => {
    function asynced(base) {
        return base;
    }

    test('with no catch clauses', () => {
        let ran = false;
        const result = attempt()
            .doSync(asynced(() => {
                ran = true;
                return 'value';
            }));

        expect(ran).toBe(true);
        expect(result).toBe('value');
    });

    describe('catchAll clause', () => {
        test('with error-throwing callback', () => {
            let actualE = null;

            const result = attempt()
                .catchAll(asynced((e) => {
                    actualE = e;
                    return 'value';
                }))
                .doSync(asynced(() => {
                    throw new ErrorOne;
                }));

            expect(actualE instanceof ErrorOne).toBe(true);
            expect(result).toBe('value');
        });

        test('with non-error-throwing callback', () => {
            let ran = false;

            const result = attempt()
                .catchAll(asynced(() => 'caught'))
                .doSync(asynced(() => {
                    ran = true;
                    return 'value';
                }));

            expect(ran).toBe(true);
            expect(result).toBe('value');
        });
    });

    describe('catch clause', () => {
        describe('with error-throwing callback', () => {
            it('catches the specific exception', () => {
                let actualE = null;

                const result = attempt()
                    .catch(ErrorOne, () => 'caughtOne')
                    .catch(ErrorChild, () => 'caughtChild')
                    .catch(ErrorTwo, asynced((e) => {
                        actualE = e;
                        return 'caughtTwo';
                    }))
                    .catchAll(() => 'caughtAll')
                    .doSync(asynced(() => {
                        throw new ErrorTwo();
                    }));

                expect(result).toBe('caughtTwo');
                expect(actualE instanceof ErrorTwo).toBe(true);
            });

            it('catches a subclass', () => {
                let actualE = null;

                const result = attempt()
                    .catch(ErrorOne, () => 'caughtOne')
                    .catch(ErrorTwo, asynced((e) => {
                        actualE = e;
                        return 'caughtTwo';
                    }))
                    .catch(ErrorChild, () => 'caughtChild')
                    .catchAll(() => 'caughtAll')
                    .doSync(asynced(() => {
                        throw new ErrorChild();
                    }));

                expect(actualE instanceof ErrorChild).toBe(true);
                expect(result).toBe('caughtTwo');
            });

            it('throws an uncaught error', () => {
                const f = () => {
                    attempt()
                        .catch(ErrorOne, () => 'caughtOne')
                        .doSync(asynced(() => {
                            throw new ErrorChild();
                        }));
                };

                expect(f).toThrow(ErrorChild);
            });
        });

        test('with non-error-throwing callback', () => {
            let ran = false;
            let catchRan = false;

            const result = attempt()
                .catch(asynced(ErrorOne, () => catchRan = true))
                .catch(asynced(ErrorTwo, () => catchRan = true))
                .catch(asynced(ErrorChild, () => catchRan = true))
                .doSync(asynced(() => {
                    ran = true;
                    return 'value';
                }));

            expect(ran).toBe(true);
            expect(result).toBe('value');
        });
    });
});