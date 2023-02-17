export class InputBuilderError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
    }
}

export class InvalidInputsError extends InputBuilderError {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
    }
}