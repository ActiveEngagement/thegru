import createInputBuilder, { valid, invalid } from './input_builder.js';

export default function(getCoreInput) {
    function input(name) {
        return createInputBuilder(name, getCoreInput(name));
    }

    function validateCards(name, value) {
        const message = `"${name}" must be a valid JSON object with document paths as keys and card titles as values!`;
        return Array.isArray(value) ? invalid(message) : valid();
    };

    return {
        userEmail: input('user_email').required().get(),
        userToken: input('user_token').required().get(),
        cards: input('cards').required().json().use(validateCards).get(),
        collectionId: input('collection_id').required().get(),
        boardId: input('board_id').get(),
        boardSectionId: input('board_section_id').get(),
        cardFooter: input('card_footer').boolean({ allowOthers: true }).get(),
        cardsFile: input('cards_file').fallback('uploaded-guru-cards.json').get(),
        debugLogging: input('debug_logging').fallback('false').boolean().get()
    };
}