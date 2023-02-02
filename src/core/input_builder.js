import { InvalidInputsError } from './error.js';

export function valid() {
    return { valid: true };
}

export function invalid(message = undefined) {
    return { valid: false, message };
}

export function result(data = null) {
    return { valid: true, data };
}

export default function(name, value) {
    function get() {
        return value;
    }

    function isInputMissing(input) {
        return input === '' || input === null || input === undefined;
    }

    function required() {
        return this.use(() => {
            if(value === null) {
                return invalid(`"${name}" is a required input!`);
            }
        });
    }

    function fallback(fallbackValue) {
        return this.use(() => {
            if(isInputMissing(value)) {
                return result(fallbackValue);
            }
        });
    }

    function boolean() {
        return this.use(() => {
            switch (value) {
            case 'true':
                return result(true);
            case 'false':
                return result(false);
            default:
                return invalid(`"${name}" must be "true" or "false"!`);
            }
        });
    }

    function json(options = {}) {
        return this.use(() => {
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

    function of(...values) {
        return this.use(() => {
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

    function ifPresent(callback) {
        if(value === null) {
            return this;
        }
        else {
            return callback(this);
        }
    }

    function attempt(callback) {
        try {
            return callback(this);
        }
        catch (e) {
            if(e instanceof InvalidInputsError) {
                return this;
            }
            else {
                throw e;
            }
        }
    }

    function use(callback) {
        let result = callback(name, value);

        if(result === undefined) {
            result = valid();
        }

        if(!result.valid) {
            throw new InvalidInputsError(result.message || `"${name}" is not valid!`);
        }

        if(result.data !== undefined) {
            value = result.data;
        }

        return this;
    }

    if(isInputMissing(value)) {
        value = null;
    }

    return { get, required, fallback, boolean, json, of, ifPresent, attempt, use };
};