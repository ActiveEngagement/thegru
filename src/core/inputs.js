import { createInputFactory, invalid, result } from 'ae_actions';
import * as types from './synced/container_types.js';
import * as verbs from './verbosities.js';

/**
 * Parses and validates the action inputs using the given input function.
 */
export default function(getCoreInput, options) {
    const { logger } = options;

    function validateCards(cards, name) {
        let i = 1;
        for(const card of cards) {
            if(typeof card !== 'string' && !card.glob) {
                return invalid(`"${name}" element ${i} has no glob!`);
            }
            i++;
        }
    }

    function validatePreferredContainerType(input, name) {
        if(types.from(types.name, input) === types.BOARD_SECTION) {
            return invalid(`"${name}" cannot be "${input}", because Guru sections are only permitted beneath boards. You should change the preferred container type to "board" and set "rootContainer" in the card rule.`);
        }
    }

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
            input('attachment_handler', b => b.fallback('auto').options('auto', 'github_urls', 'upload'));
            input('verbosity', b => b
                .fallback(verbs.name(verbs.INFO))
                .options(...verbs.verbosities(verbs.name))
                .use(name => result(verbs.from(verbs.name, name)))
            );

            const type = input('collection_type', b => b.required().options('standard', 'synced'));

            if(type === 'standard') {
                logger.info('theguru is in "standard" collection mode.');

                input('cards', b => b.required().json({ type: 'object' }));
                input('board_id');
                input('board_section_id');
                input('cards_file', b => b.fallback('uploaded-guru-cards.json'));
                input('update_all', b => b.fallback('false').boolean());
            }
            else if(type === 'synced') {
                logger.info('theguru is in "synced" collection mode.');

                input('cards', b => b.required().json({ type: 'array'}).use(validateCards));
                input('containers', b => b.fallback('{ }').json({ type: 'object'}));
                input('preferred_container', b => b
                    .fallback(types.name(types.BOARD_GROUP))
                    .options(...types.types(types.name))
                    .use(validatePreferredContainerType)
                );
            }
        });
}