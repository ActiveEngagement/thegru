import { FetchError } from "node-fetch";

function jsonOrText(input) {
    try {
        return JSON.parse(input);
    } catch {
        return input;
    }
}

export default async function(response) {
    const text = await response.text();

    if (!response.ok) {
        throw new FetchError(response, jsonOrText(text));
    }
    else if (!text || text === '') {
        return null;
    } else {
        return jsonOrText(text);
    }
}