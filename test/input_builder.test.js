import { InvalidInputsError } from '../src/error';
import input from '../src/input_builder.js';

test('simple builder returns value', () => {
    expect(input('test_value', 123).get()).toBe(123);
});

test('required builder returns value', () => {
    expect(input('test_value', 123).required().get()).toBe(123);
});

test('required builder without value throws error', () => {
    const f = value => () => input('test_value', value).required();

    expect(f(null)).toThrow(InvalidInputsError);
    expect(f(null)).toThrow('"test_value" is a required input!');
    expect(f('')).toThrow(InvalidInputsError);
    expect(f('')).toThrow('"test_value" is a required input!');
});

test('builder with fallback returns value', () => {
    expect(input('test_value', 123).fallback(456).get()).toBe(123);
});

test('builder with fallback with no value returns fallback', () => {
    expect(input('test_value', null).fallback(456).get()).toBe(456);
    expect(input('test_value', '').fallback(456).get()).toBe(456);
});

test('boolean builder with true returns true', () => {
    expect(input('test_value', 'true').boolean().get()).toBe(true);
});

test('boolean builder with false returns true', () => {
    expect(input('test_value', 'false').boolean().get()).toBe(false);
});

test('boolean builder with invalid value throws error', () => {
    const f = () => input('test_value', 'bad').boolean();

    expect(f).toThrow(InvalidInputsError);
    expect(f).toThrow('"test_value" must be "true" or "false"!');
});

test('boolean builder with invalid value and allowOthers does nothing', () => {
    const actual = input('test_value', 'bad').boolean({ allowOthers: true }).get();
    expect(actual).toBe('bad');
});

test('boolean required builder with fallback', () => {
    expect(input('test_value', null).fallback('true').required().boolean().get());
});