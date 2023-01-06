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

    function boolean(options = {}) {
        return this.use(() => {
            switch (value) {
            case 'true':
                return result(true);
            case 'false':
                return result(false);
            default:
                if(!options.allowOthers) {
                    return invalid(`"${name}" must be "true" or "false"!`);
                }
            }
        });
    }

    function json(options = {}) {
        return this.use(() => {
            if(value === null && !options.allowInvalid) {
                return invalid(`"${name}" must not be null!`);
            }

            try {
                return result(JSON.parse(value));
            }
            catch {
                if(!options.allowInvalid) {
                    return invalid(`"${name}" must be valid JSON!`);
                }
            }
        });
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

    return { get, required, fallback, boolean, json, use };
};