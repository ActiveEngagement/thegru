import fs from 'fs';
import { readFile, srcUrl, writeFile } from '../fs_util.js';
import { attempt } from '../util.js';
import commitFlags from '../commit_flags.js';
import handleCard from './handle_card.js';
import { InvalidGitObjectError } from '../error.js';

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
        getChangedFiles,
        attachmentHandler
    } = options;

    // Determine the card footer.
    let footer = inputs.cardFooter;
    if(footer === undefined || footer === null || footer === true) {
        logger.debug('Using default card footer...');
        footer = defaultFooter;
    }

    // Determine whether all cards should be updated and notify the user accordingly. All cards should be updated if:
    //   the "update_all" input is true, or
    //   the [guru update] commit flag is included.

    let updateAll = inputs.updateAll;

    if(updateAll) {
        logger.info('"update_all" is true. All cards will be updated.');
    }

    commitFlags()
        .flag('guru update', () => {
            if(!updateAll) {
                logger.info(colors.blue('[guru update] flag detected. All cards will be updated.'));
                updateAll = true;
            }
        })
        .execute(github?.commit?.message, { logger });

    // If all files should be updated, all files will be treated as changed.
    let didFileChange = () => true;
    
    if(!updateAll) {
        // Otherwise, try to get a list of changed files.
        await attempt()
            .catch(InvalidGitObjectError, () => {
                logger.warning('The Git command used to determine which files have changed reported an invalid object error. Most likely, you forgot to include `fetch-depth` in your checkout action. All cards will be updated.');
            })
            .do(async() => {
                const changedFiles = await getChangedFiles();
                didFileChange = (filePath) => changedFiles.includes(filePath);
            });
    }

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
            existingCardIds: cardIds,
            didFileChange
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

        // Note that Guru will never return a 404 for a card that has previously existed.
        // Therefore, we won't try to handle it, since that would be a signifcant error anyway.
        await api.destroyCard(id);

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