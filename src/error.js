export class TheGuruError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
    }
}


export class FetchError extends TheGuruError {
    constructor(response, json) {
        super(this.#createMessage(response, json));
        this.name = this.constructor.name;
        this.response = response;
        this.json = json;
    }

    #createMessage(response, json) {
        const description = json?.description;

        return `Server responded with a ${response.status} code: ${description}` || `Server responded with a ${response.status} status code`;
    }
}