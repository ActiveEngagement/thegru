export default function(getCoreInput) {
    function getInput(name, fallback = null) {
        const input = getCoreInput(name);
        return input === '' && fallback !== null ? fallback : input;
    }

    function isInputMissing(input) {
        return input === '' || input === null || input === undefined;
    }

    function getRequiredInput(name) {
        const input = getInput(name);

        if(isInputMissing(input)) throw `"${name}" is a required input!`;

        return input;
    }

    return {
        userEmail: getRequiredInput('user_email'),
        userToken: getRequiredInput('user_token'),
        filePath: getRequiredInput('file_path'),
        cardTitle: getRequiredInput('card_title'),
        collectionId: getRequiredInput('collection_id'),
        boardId: getInput('board_id'),
        boardSectionId: getInput('board_section_id'),
        cardFooter: getInput('card_footer'),
        wrapMarkdown: getInput('wrap_markdown', true)
    };
}