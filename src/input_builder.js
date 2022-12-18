import { InvalidInputsError } from './error.js';

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

    function boolean() {
        switch (value) {
        case 'true':
            value = true;
            break;
        case 'false':
            value = false;
            break;
        default:
            throw new InvalidInputsError(`"${name}" must be "true" or "false"!`);
        }

        return this;
    }

    if(isInputMissing(value)) {
        value = null;
    }

    return { get, required, fallback, boolean };
};