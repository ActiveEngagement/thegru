import { AeActionsError, InvalidInputsError } from '../src/error.js';
import createFactory from '../src/input_builder_factory.js';
import { invalid, result, valid } from '../src/result.js';

describe('input_builder_factory.js', () => {
    test('basic custom registration', () => {
        const builder = (b) => b.use((value) => result(value + '!'));
        const factory = createFactory()
            .register('custom', builder)
            .getInputWith(() => 'test');

        expect(factory.make(null).custom().get()).toBe('test!');
    });

    test('custom registration with arguments', () => {
        const builder = (b, _, suffix) => b.use((value) => result(value + suffix));
        const factory = createFactory()
            .register('custom', builder)
            .getInputWith(() => 'test');

        expect(factory.make(null).custom('??').get()).toBe('test??');
    });

    describe('without input callback', () => {
        it('throws appropriate error', () => {
            const f = () => createFactory().make();

            expect(f).toThrow(AeActionsError);
            expect(f).toThrow('A getInputWith callback is required in order to instantiate an input builder!');
        });
    });

    describe('define()', () => {
        test('with valid inputs', () => {
            const factory = createFactory()
                .defaults()
                .getInputWith((name) => name === 'boolean' ? 'true' : name + '!');

            let innerRequired = undefined;
            let innerOptional = undefined;
            let innerBoolean = undefined;

            const inputs = factory.define((input) => {
                innerRequired = input('required_input', b => b.required());
                innerOptional = input('optional');
                innerBoolean = input('boolean', b => b.boolean());
            });

            expect(innerRequired).toBe('required_input!');
            expect(innerOptional).toBe('optional!');
            expect(innerBoolean).toBe(true);

            expect(inputs).toStrictEqual({
                requiredInput: 'required_input!',
                optional: 'optional!',
                boolean: true
            });
        });

        test('with invalid inputs', () => {
            const success = (b) => b.use(() => valid());
            const fail = (b) => b.use(() => invalid());

            const factory = createFactory()
                .register('success', success)
                .register('fail', fail)
                .getInputWith(() => 'test'); 

            let innerOk = undefined;
            let innerLast = undefined;

            const f = () => factory.define((input) => {
                innerOk = input('ok', b => b.success());
                input('bad', b => b.fail());
                innerLast = input('never');
            });

            expect(f).toThrow(InvalidInputsError);
            expect(innerOk).toBe('test');
            expect(innerLast).toBe(undefined);
        });
    });
});