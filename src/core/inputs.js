import createInputBuilder, { valid, invalid } from './input_builder.js';

export default function(getCoreInput) {
    function input(name) {
        return createInputBuilder(name, getCoreInput(name));
    }

    return {
        userEmail: input('user_email').required().get(),
        userToken: input('user_token').required().get(),
        cards: input('cards').required().json({ type: 'object' }).get(),
        collectionId: input('collection_id').required().get(),
        boardId: input('board_id').get(),
        boardSectionId: input('board_section_id').get(),
        github: input('github').required().json({ type: 'object' }).get(),
        cardFooter: input('card_footer').attempt(i => i.boolean()).get(),
        cardsFile: input('cards_file').fallback('uploaded-guru-cards.json').get(),
        imageHandler: input('image_handler').fallback('auto').of('auto', 'github_urls', 'upload').get(),
        debugLogging: input('debug_logging').fallback('false').boolean().get()
    };
}