export class TheGuruError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
    }
}

export class InvalidInputsError extends TheGuruError {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
    }
}

export function fetchErrorForResponse(response, json) {
    const description = json?.description;
    const message = description ? `Server responded with a ${response.status} status code: ${description}` : `Server responded with a ${response.status} status code`;
    const error = new FetchError(message, response);
    error.json = json;

    return error;
}
export class FetchError extends TheGuruError {
    constructor(message, response) {
        super(message);
        this.name = this.constructor.name;
        this.response = response;
    }
}