export class AeActionsError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
    }
}

export class InvalidInputsError extends AeActionsError {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
    }
}