import { InvalidInputsError } from './error.js';
import { valid, result } from './result.js';

function isInputMissing(input) {
    return input === '' || input === null || input === undefined;
}

export default function(name, getInput) {
    const operations = [];

    function run() {
        let value = getInput(name);

        if(isInputMissing(value)) {
            value = null;
        }

        for(const operate of operations) {
            let result = operate(value, name);

            if(result === undefined) {
                result = valid();
            }

            if(!result.valid) {
                return result;
            }

            if(result.data !== undefined) {
                value = result.data;
            }
        }

        return result(value);
    }

    function get() {
        const result = this.run();

        if(!result.valid) {
            throw new InvalidInputsError(result.message || `"${name}" is not valid!`);
        }

        return result.data;
    }

    function use(operation) {
        operations.push(operation);

        return this;
    }

    return { use, run, get };
}