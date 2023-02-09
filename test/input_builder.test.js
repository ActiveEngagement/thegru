import { InvalidInputsError } from '../src/core/error.js';
import input, { invalid, result, valid } from '../src/core/input_builder.js';

const noValueCases = [
    [null],
    [undefined],
    ['']
];

describe('simple builder', () => {
    it('returns value', () => {
        expect(input('test_value', 123).get()).toBe(123);
    });
});

describe('required builder', () => {
    it('returns value', () => {
        expect(input('test_value', 123).required().get()).toBe(123);
    });

    it.each(noValueCases)('throws error with no value', (value) => {
        const f = value => () => input('test_value', value).required();

        expect(f(value)).toThrow(InvalidInputsError);
        expect(f(value)).toThrow('"test_value" is a required input!');
    });
});

describe('builder with fallback', () => {
    it('returns value', () => {
        expect(input('test_value', 123).fallback(456).get()).toBe(123);
    });

    it.each(noValueCases)('returns fallback with no value', (value) => {
        expect(input('test_value', value).fallback(456).get()).toBe(456);
    });
});

describe('boolean builder', () => {
    it('returns true with true', () => {
        expect(input('test_value', 'true').boolean().get()).toBe(true);
    });

    it('returns false with false', () => {
        expect(input('test_value', 'false').boolean().get()).toBe(false);
    });

    it('throws error with invalid value', () => {
        const f = () => input('test_value', 'bad').boolean();

        expect(f).toThrow(InvalidInputsError);
        expect(f).toThrow('"test_value" must be "true" or "false"!');
    });
});

describe('json builder', () => {
    it('returns parsed json when valid', () => {
        const json = `{
            "one": [1, 2, 3],
            "two": {"abc": "value"}
        }`;
        expect(input('test', json).json().get()).toStrictEqual({ one: [1,2,3], two: {abc: 'value'}});
    });

    test.each([
        [null, {}, '"test_value" must not be null!'],
        ['invalid', {}, '"test_value" must be valid JSON!'],
        ['{ one: 123 }', {}, '"test_value" must be valid JSON!'],
        ['{ "one": 123 }', { type: 'array' }, '"test_value" must be a valid JSON array, not an object!'],
        ['[ "one", "two" ]', { type: 'object' }, '"test_value" must be a valid JSON object, not an array!']
    ])('with invalid json it throws error', (value, options, message) => {
        const f = () => input('test_value', value).json(options);

        expect(f).toThrow(InvalidInputsError);
        expect(f).toThrow(message);
    });
});

describe('array builder', () => {
    it.each([
        [['one', 'two', 'three'], 'three'],
        [[1, 3, undefined, 'another'], 3],
    ])('returns value with valid option', (options, inputValue) => {
        expect(input('test', inputValue).of(...options).get()).toBe(inputValue);
    });

    it.each([
        [['one', 'two', 'three'], 'four'],
        [[], ''],
        [[], 'something'],
        [[], null],
        [[], undefined],
        [['', 'another', 3, 5], 4],
    ])('throws error with invalid option', (options, inputValue) => {
        const f = () => input('test', inputValue).of(...options);
        expect(f).toThrow(InvalidInputsError);
    });

    it('finds value with different case', () => {
        expect(input('test', 'VaLid').of('one', 'two', 'valiD').get()).toBe('valiD');
    });
});

describe('ifPresent', () => {
    describe('when input is present', () => {
        it('uses the callback', () => {
            expect(input('test', 'true').required().ifPresent(i => i.boolean()).get()).toBe(true);
        });
        describe('when callback throws an error', () => {
            it('throws it', () => {
                const f = () => input('test', 'invalid').required().ifPresent(i => i.boolean());
                expect(f).toThrow(InvalidInputsError);
                expect(f).toThrow('"test" must be "true" or "false"!');
            });
        });
    });

    describe('when input is not present', () => {
        it('does not use the callback', () => {
            expect(input('test', '').ifPresent(i => i.boolean()).get()).toBe(null);
        });
    });
});

describe('attempt', () => {
    test('when callback succeeds', () => {
        expect(input('test', 'true').required().attempt(i => i.boolean()).get()).toBe(true);
    });

    test('when callback throws InvalidInputError', () => {
        expect(input('test', 'invalid').required().attempt(i => i.boolean()).get()).toBe('invalid');
    });

    test('when callback throws other error', () => {
        const callback = () => {
            throw 'Hi!';
        };
        const f = () => input('test', 'example').required().attempt(callback);
        expect(f).toThrow('Hi!');
    });
});

describe('custom builder', () => {
    it('passes the name and value', () => {
        const builder = function(name, value) {
            expect(name).toBe('someRandomName!');
            expect(value).toBe('someRandomValue!');

            return valid();
        };
        input('someRandomName!', 'someRandomValue!').use(builder);
    });

    it('returns initial value when returns empty valid response', () => {
        expect(input('input', 'initial').use(() => valid()).get()).toBe('initial');
    });

    it('returns initial value when returns undefined', () => {
        expect(input('input', 'initial').use(() => { }).get()).toBe('initial');
    });

    it('returns new value when returns hydrated valid response', () => {
        expect(input('input', 'initial').use(() => result(123)).get()).toBe(123);
    });

    it('returns new value when returns hydrated valid response', () => {
        expect(input('input', 'initial').use(() => result(123)).get()).toBe(123);
    });

    it('throws default error when returns empty invalid response', () => {
        const f = () => input('input', 'value').use(() => invalid());
        expect(f).toThrow(InvalidInputsError);
        expect(f).toThrow('"input" is not valid!');
    });

    it('throws proper error when returns hydrated invalid response', () => {
        const f = () => input('input', 'value').use(() => invalid('Message!'));
        expect(f).toThrow(InvalidInputsError);
        expect(f).toThrow('Message!');
    });
});

test('boolean required builder with fallback', () => {
    expect(input('test_value', null).fallback('true').required().boolean().get());
});