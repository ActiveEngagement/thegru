import { result, invalid } from '../result.js';

export default function(builder, _factory, options = {}) {
    return builder.use((value, name) => {
        if(value === null) {
            return invalid(`"${name}" must not be null!`);
        }

        let parsed = null;

        try {
            parsed = JSON.parse(value);
        }
        catch {
            return invalid(`"${name}" must be valid JSON!`);
        }

        if(Array.isArray(parsed)) {
            if(options.type === 'object') {
                return invalid(`"${name}" must be a valid JSON object, not an array!`);
            }
        }
        else {
            if(options.type === 'array') {
                return invalid(`"${name}" must be a valid JSON array, not an object!`);
            }
        }

        return result(parsed);
    });
}