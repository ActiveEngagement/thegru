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

function createMessage(response, json) {
    const description = json?.description;

    return `Server responded with a ${response.status} code: ${description}` || `Server responded with a ${response.status} status code`;
}
export class FetchError extends TheGuruError {
    constructor(response, json) {
        super(createMessage(response, json));
        this.name = this.constructor.name;
        this.response = response;
        this.json = json;
    }
}