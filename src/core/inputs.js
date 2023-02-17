import { factory } from 'input_builder';

export default function(getCoreInput) {
    const inputs = factory()
        .defaults()
        .getInputWith(getCoreInput);

    return {
        userEmail: inputs.make('user_email').required().get(),
        userToken: inputs.make('user_token').required().get(),
        cards: inputs.make('cards').required().json({ type: 'object' }).get(),
        collectionId: inputs.make('collection_id').required().get(),
        boardId: inputs.make('board_id').get(),
        boardSectionId: inputs.make('board_section_id').get(),
        github: inputs.make('github').required().json({ type: 'object' }).get(),
        cardFooter: inputs.make('card_footer').try(i => i.boolean()).get(),
        cardsFile: inputs.make('cards_file').fallback('uploaded-guru-cards.json').get(),
        imageHandler: inputs.make('image_handler').fallback('auto').options('auto', 'github_urls', 'upload').get(),
        updateAll: inputs.make('update_all').fallback('false').boolean().get(),
        ansi: inputs.make('ansi').fallback('true').boolean().get(),
        debugLogging: inputs.make('debug_logging').fallback('false').boolean().get()
    };
}