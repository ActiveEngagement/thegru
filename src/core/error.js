/**
 * The base class for all custom exceptions thrown by this action.
 */
export class TheGuruError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
    }
}

/**
 * Thrown when a Git command reports an invalid Git object (e.g. a nonexistent commit).
 */
export class InvalidGitObjectError extends TheGuruError {
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

/**
 * Thrown when an API call returns a bad response.
 */
export class FetchError extends TheGuruError {
    constructor(message, response) {
        super(message);
        this.name = this.constructor.name;
        this.response = response;
    }
}

/**
 * Thrown whenever the container structure configured for a synced collection is impossible to create.
 */
export class InvalidContainerConfigurationError extends TheGuruError {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
    }
}