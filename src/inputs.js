import createInputBuilder from './input_builder.js';

export default function(getCoreInput) {
    function input(name) {
        return createInputBuilder(name, getCoreInput(name));
    }

    return {
        userEmail: input('user_email').required().get(),
        userToken: input('user_token').required().get(),
        filePath: input('file_path').required().get(),
        cardTitle: input('card_title').required().get(),
        collectionId: input('collection_id').required().get(),
        boardId: input('board_id').get(),
        boardSectionId: input('board_section_id').get(),
        cardFooter: input('card_footer').boolean({ allowOthers: true }).get(),
        cardId: input('card_id').get(),
        workflowFile: input('workflow_file').fallback('guru.yaml').get(),
        debugLogging: input('debug_logging').fallback('false').boolean().get()
    };
}