import { createInputFactory } from 'ae_actions';
import validateCards from './synced/validate_cards.js';

export default function(getCoreInput, options) {
    const { logger } = options;

    return createInputFactory()
        .defaults()
        .getInputWith(getCoreInput)
        .define((input) => {
            input('user_email', b => b.required());
            input('user_token', b => b.required());
            input('github', b => b.required().json({ type: 'object' }));
            input('collection_id', b => b.required());

            input('card_footer', b => b.try(b => b.boolean()));
            input('ansi', b => b.fallback('true').boolean());
            input('debug_logging', b => b.fallback('false').boolean());

            const type = input('collection_type', b => b.required().options('standard', 'synced'));

            if(type === 'standard') {
                logger.info('theguru is in "standard" collection mode.');

                input('cards', b => b.required().json({ type: 'object' }));
                input('board_id');
                input('board_section_id');
                input('cards_file', b => b.fallback('uploaded-guru-cards.json'));
                input('image_handler', b => b.fallback('auto').options('auto', 'github_urls', 'upload'));
                input('update_all', b => b.fallback('false').boolean());
            }
            else if(type === 'synced') {
                logger.info('theguru is in "synced" collection mode.');

                input('cards', b => b.required().json({ type: 'array'}).use(validateCards));
                input('prefer_sections', b => b.fallback('false').boolean());
            }
        });
}