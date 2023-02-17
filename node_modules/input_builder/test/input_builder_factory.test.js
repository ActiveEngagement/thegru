import { InputBuilderError } from '../src/error.js';
import createFactory from '../src/input_builder_factory.js';
import { result } from '../src/result.js';

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

            expect(f).toThrow(InputBuilderError);
            expect(f).toThrow('A getInputWith callback is required in order to instantiate an input builder!');
        });
    });
});