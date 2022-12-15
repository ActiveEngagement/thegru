import TheGuruError from './error.js';

function message(response, json) {
    const description = json?.description;

    return `Server responded with a ${response.status} code: ${description}` || `Server responded with a ${response.status} status code`;
}

export default class FetchError extends TheGuruError
{
    constructor(response, json) {
        super(message(response, json));
        this.name = this.constructor.name;
    }
}