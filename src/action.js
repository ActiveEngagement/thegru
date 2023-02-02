import fs from 'fs';
import { readFile, srcUrl, writeFile } from './fs_util.js';
import attempt from './attempt.js';
import commitFlags from './commit_flags.js';
import createApi from './api.js';
import handleCard from './handle_card.js';
import { InvalidGitObjectError } from './error.js';

/**
 * This is the entrypoint for most of the action logic. It is intentionally abstracted away from GitHub Actions and
 * should be executable even in a test environment.
 */

export default async function(options) {
    const {
        client,
        logger,
        colors,
        inputs,
        github,
        commitCardsFile,
        getChangedFiles
    } = options;

    // Determine the image handler.
    let imageHandler = inputs.imageHandler;
    if(imageHandler === 'auto') {
        imageHandler = github.repo.isPublic ? 'github_urls' : 'upload';
    }

    // Determine the card footer.
    const defaultFooter = await readFile(srcUrl('resources/default_card_footer.md'));
    let footer = inputs.footer;
    if(footer === undefined || footer === null || footer === true) {
        logger.info('Using default card footer...');
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
            if (!updateAll) {
                logger.info(colors.blue('[guru update] flag detected. All cards will be updated.'));
                updateAll = true;
            }
        })
        .execute(message, { logger });

    let didFileChange;
    
    if (updateAll) {
        // If all files should be updated, all files will be treated as changed.
        didFileChange = () => true;
    }
    else {
        // Otherwise, try to get a list of changed files.
        await attempt()
            .to(async () => {
                const changedFiles = await getChangedFiles({ logger });
                didFileChange = (filePath) => changedFiles.includes(filePath);
            })
            .catch(InvalidGitObjectError, () => {
                logger.warning('The Git command used to determine which files have changed reported an invalid object error. Most likely, you forgot to include `fetch-depth` in your checkout action.');
            });
    }

    // Set up the API with the given client.
    const api = createApi(client, {
        logger,
        guruEndpoint: inputs.endpoint,
        userEmail: inputs.userEmail,
        userToken: inputs.userToken
    });

    let cardsFileContent = '{}';

    // Read the cards file if it exists.
    if (fs.existsSync(inputs.cardsFile)) {
        cardsFileContent = await readFile(inputs.cardFile);
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
            imageHandler,
            footer,
            existingCardIds: cardIds,
            didFileChange
        });
        newCardIds[filePath] = id;

        logger.endGroup();
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