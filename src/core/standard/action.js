import fs from 'fs';
import { readFile, srcUrl, writeFile } from '../fs_util.js';
import commitFlags from '../commit_flags.js';
import handleCard from './handle_card.js';

/**
 * This is the entrypoint for most of the standard-collection-based action logic. It is intentionally abstracted away
 * from GitHub Actions and should be executable even in a test environment.
 */
export default async function(options) {
    const {
        api,
        logger,
        colors,
        inputs,
        github,
        defaultFooter,
        commitCardsFile,
        attachmentHandler
    } = options;

    // Determine the card footer.
    let footer = inputs.cardFooter;
    if(footer === undefined || footer === null || footer === true) {
        logger.debug('Using default card footer...');
        footer = defaultFooter;
    }

    // NOTE: At the moment, there are no commit flags. Some may be added later on.
    commitFlags().execute(github?.commit?.message, { logger });

    let cardsFileContent = '{}';

    // Read the cards file if it exists.
    if(inputs.cardsFile && fs.existsSync(inputs.cardsFile)) {
        cardsFileContent = await readFile(inputs.cardsFile);
    }

    const cardIds = JSON.parse(cardsFileContent);
    const newCardIds = {};

    logger.info('Syncing cards...');

    // Sync (i.e. create or update) each card in the cards config.
    for(const [filePath, cardTitle] of Object.entries(inputs.cards)) {
        logger.startGroup(filePath);

        const id = await handleCard(filePath, cardTitle, {
            logger,
            api,
            github,
            inputs,
            attachmentHandler,
            footer,
            existingCardIds: cardIds
        });
        newCardIds[filePath] = id;

        logger.endGroup();
    }

    // Skip the cards file update if appropriate.
    if(!inputs.cardsFile) {
        logger.info(colors.blue('Skipping update of the cards file since "cards_file" is "false".'));
        return;
    }

    // Get the cards that were present in the old cards file but not in the new one.
    const old = Object.entries(cardIds)
        .filter(([_, id]) =>
            !Object.values(newCardIds)
                .some((newId) => id === newId));
    
    if(old.length > 0) {
        logger.info('\nDestroying old cards...');
    }
    
    // Destroy each old card.
    for(const [filePath, id] of old) {
        logger.startGroup(filePath);
        logger.info(`Previously uploaded card ${id} has been removed from the cards config. Removing it from Guru...`);

        if ((await api.destroyCard(id)) === false) {
            logger.debug('Card not destroyed. Guru returned a 404.');
        }

        logger.endGroup();
    }

    const newCardsFileContent = JSON.stringify(newCardIds, null, 4);

    // Update the cards file if necessary.
    if(newCardsFileContent !== cardsFileContent) {
        logger.info(`\nUpdating ${inputs.cardsFile}`);

        await writeFile(inputs.cardsFile, newCardsFileContent);

        const messageTemplate = await readFile(srcUrl('resources/cards_commit_message.txt'));
        const message = messageTemplate.replaceAll('{{cardsFile}}', inputs.cardsFile);

        await commitCardsFile({
            path: inputs.cardsFile,
            email: 'noreply@actengage.com',
            name: 'theguru Action Bot',
            message
        });
    }
}