import nodeFetch from 'node-fetch';

/**
 * A fetch implementation that delegates to node-fetch and generates debug messages.
 */

export default function(container) {
    const { logger } = container;

    return async function(method, url, options = {}) {
        options.method = options.method || method;

        logger.debug(`Sending HTTP request to ${url} with options: ${JSON.stringify(options)}`);

        const response = fixResponse(await nodeFetch(url, options));

        logger.trace(`Received response from ${url}: ${await response.text()}`);

        return response;
    };
}

/**
 * Transforms a node-fetch response so that its body can be read multiple times.
 * 
 * Because node-fetch uses streams, its responses will by default throw errors if they are re-read.
 */

export function fixResponse(response) {
    let text = undefined;

    // Store the original text() function, so we can access it later.
    response.readTextFromStream = response.text;

    // Redefine the text function so that:
    //   if it has never been called before, it calls the original function and returns the result, and
    //   if it has been called before, it returns the result of the previous invocation.
    response.text = async function() {
        if(text === undefined) {
            if(response.status === 204) {
                // If the response was a 204 No Content, then textFromStream() will likely raise an error.
                // Let's just return null instead.
                text = null;
            }
            else {
                text = await response.readTextFromStream();
            }
        }

        return text;
    };

    return response;
}