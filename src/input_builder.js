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
        if(value === null) {
            throw new InvalidInputsError(`"${name}" is a required input!`);
        }

        return this;
    }

    function fallback(fallbackValue) {
        if(isInputMissing(value)) {
            value = fallbackValue;
        }

        return this;
    }

    function boolean(options = {}) {
        switch (value) {
        case 'true':
            value = true;
            break;
        case 'false':
            value = false;
            break;
        default:
            if(!options.allowOthers) {
                throw new InvalidInputsError(`"${name}" must be "true" or "false"!`);
            }
        }

        return this;
    }

    function json(options = {}) {
        if(value === null) {
            if(options.allowInvalid) {
                value = null;
            }
            else {
                throw new InvalidInputsError(`"${name}" must not be null!`);
            }
        }

        try {
            value = JSON.parse(value);
        }
        catch {
            if(!options.allowInvalid) {
                throw new InvalidInputsError(`"${name}" must be valid JSON!`);
            }
        }

        return this;
    }

    function use(callback) {
        let result = callback(name, value);

        if(result ===  undefined) {
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