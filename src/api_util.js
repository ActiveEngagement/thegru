export function wrapGuruMarkdown(input) {
    // The deprecated escape function is REQUIRED here, since Guru seems to use unescape on their end.
    return `<div class="ghq-card-content__markdown" data-ghq-card-content-type="MARKDOWN" data-ghq-card-content-markdown-content="${escape(input)}"></div>`;
}

export function wrapResponse(response) {
    let text = null;

    response.readTextFromStream = response.text;

    response.text = async function() {
        text ||= await response.readTextFromStream();

        return text;
    };

    return response;
}