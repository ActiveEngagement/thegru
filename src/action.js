import fs from 'fs';
import createApi from './api.js';
import { pick } from './util.js';
import handleCard from './handle_card.js';
import { readFile, writeFile } from './fs_util.js';
import { FetchError } from './error.js';

export default async function(options) {
    const { logger } = options;

    const api = createApi(options.client, pick(options,
        { guruEndpoint: 'endpoint' },
        'userEmail',
        'userToken',
        'logger'
    ));

    const cardsFileContent = fs.existsSync(options.cardsFile) ? await readFile(options.cardsFile) : '{}';
    const cardIds = JSON.parse(cardsFileContent);
    const newCardIds = {};

    for(const [filePath, cardTitle] of Object.entries(options.cards)) {
        logger.startGroup(filePath);
        const id = await handleCard({
            ...pick(options,
                'cardsFile',
                'collectionId',
                'boardId',
                'boardSectionId',
                'commitCardsFile',
                'cardFooter',
                'defaultCardFooter',
                'imageHandler',
                'github',
                'didFileChange'
            ),
            existingCardIds: cardIds,
            filePath,
            cardTitle,
            api,
            logger
        });
        newCardIds[filePath] = id;
        logger.endGroup();
    }

    for(const [filePath, id] of Object.entries(cardIds)) {
        if(!Object.values(newCardIds).some((newId) => id === newId)) {
            logger.startGroup(filePath);
            logger.info(`Previously uploaded card ${id} has been removed from the cards config. Removing it from Guru...`);
            // Note that Guru will never return a 404 for a card that has previously existed.
            // Therefore, we won't try to handle it, since that would be a signifcant error anyway.
            await api.destroyCard(id);
            logger.endGroup();
        }
    }

    const newCardsFileContent = JSON.stringify(newCardIds);

    if(newCardsFileContent !== cardsFileContent) {
        logger.info(`\nUpdating ${options.cardsFile}`);

        await writeFile(options.cardsFile, JSON.stringify(newCardIds, null, 4));

        const message = (await readFile(new URL('resources/cards_commit_message.txt', import.meta.url)))
            .replaceAll('{{cardsFile}}', options.cardsFile);

        await options.commitCardsFile({
            path: options.cardsFile,
            email: 'noreply@actengage.com',
            name: 'theguru Action Bot',
            message
        });
    }
}