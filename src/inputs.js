function createInput(name, value) {
    function get() {
        return value;
    }

    function isInputMissing(input) {
        return input === '' || input === null || input === undefined;
    }

    function required() {
        if(isInputMissing(value)) {
            throw `"${name}" is a required input!`;
        }

        return this;
    }

    function fallback(fallbackValue) {
        if(isInputMissing(value)) {
            value = fallbackValue;
        }

        return this;
    }

    function boolean() {
        switch (value) {
        case 'true':
            value = true;
            break;
        case 'false':
            value = false;
            break;
        default:
            throw `"${name}" must be "true" or "false"!`;
        }

        return this;
    }

    return { get, required, fallback, boolean };
};

export default function(getCoreInput) {
    function input(name, fallback = null) {
        let value = getCoreInput(name);
        value = value === '' && fallback !== null ? fallback : value;

        return createInput(name, value);
    }

    return {
        userEmail: input('user_email').required().get(),
        userToken: input('user_token').required().get(),
        filePath: input('file_path').required().get(),
        cardTitle: input('card_title').required().get(),
        collectionId: input('collection_id').required().get(),
        boardId: input('board_id').get(),
        boardSectionId: input('board_section_id').get(),
        cardFooter: input('card_footer').get()
    };
}