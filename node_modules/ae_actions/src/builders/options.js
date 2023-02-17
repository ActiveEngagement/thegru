import { result, invalid } from '../result.js';

export default function(builder, _factory, ...values) {
    return builder.use((value, name) => {
        const valueTerm = typeof value === 'string' ? value.toLowerCase() : value;
        const matchIndex = values.findIndex(currentValue => {
            const currentValueTerm = typeof currentValue === 'string' ? currentValue.toLowerCase() : currentValue;
            return currentValueTerm === valueTerm;
        });
        if(matchIndex >= 0) {
            return result(values[matchIndex]);
        }
        else {
            return invalid(`"${name}" must be one of [${values.join(', ')}]`);
        }
    });
}