import { InvalidInputsError } from '../src/error';
import input, { invalid, result, valid } from '../src/input_builder.js';

const noValueCases = [
    [null],
    [undefined],
    ['']
];

describe('simple builder', () => {
    it('returns value', () => {
        expect(input('test_value', 123).get()).toBe(123);
    })
})

describe('required builder', () => {
    it('returns value', () => {
        expect(input('test_value', 123).required().get()).toBe(123);
    });

    it.each(noValueCases)('throws error with no value', (value) => {
        const f = value => () => input('test_value', value).required();

        expect(f(value)).toThrow(InvalidInputsError);
        expect(f(value)).toThrow('"test_value" is a required input!');
    });
})

describe('builder with fallback', () => {
    it('returns value', () => {
        expect(input('test_value', 123).fallback(456).get()).toBe(123);
    });

    it.each(noValueCases)('returns fallback with no value', (value) => {
        expect(input('test_value', value).fallback(456).get()).toBe(456);
    });
})

describe('boolean builder', () => {
    it('returns true with true', () => {
        expect(input('test_value', 'true').boolean().get()).toBe(true);
    });

    it('returns false with false', () => {
        expect(input('test_value', 'false').boolean().get()).toBe(false);
    });

    describe('with invalid value', () => {
        it('throws error', () => {
            const f = () => input('test_value', 'bad').boolean();

            expect(f).toThrow(InvalidInputsError);
            expect(f).toThrow('"test_value" must be "true" or "false"!');
        });

        it('does nothing with allowOthers', () => {
            const actual = input('test_value', 'bad').boolean({ allowOthers: true }).get();
            expect(actual).toBe('bad');
        });
    });
});

describe('json builder', () => {
    it('returns parsed json when valid', () => {
        const json = `{
            "one": [1, 2, 3],
            "two": {"abc": "value"}
        }`;
        expect(input('test', json).json().get()).toStrictEqual({ one: [1,2,3], two: {abc: 'value'}});
    })

    describe.each([
        [null, '"test_value" must not be null!'],
        ['invalid', '"test_value" must be valid JSON!'],
        ['{ one: 123 }', '"test_value" must be valid JSON!']
    ])('with invalid json', (value, message) => {
        it('throws error', () => {
            const f = () => input('test_value', value).json();

            expect(f).toThrow(InvalidInputsError);
            expect(f).toThrow(message);
        })

        it('does nothing with allowInvalid', () => {
            const actual = input('test_value', value).json({ allowInvalid: true }).get();
            expect(actual).toBe(value);
        })
    })
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