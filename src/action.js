import fs from 'fs';
import createApi from './api.js';
import { pick } from './util.js';
import handleCard from './handle_card.js';
import { readFile, writeFile } from './fs_util.js';

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
                'repositoryUrl'
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

    const newCardsFileContent = JSON.stringify(newCardIds);

    if(newCardsFileContent !== cardsFileContent) {
        logger.info(`Updating ${options.cardsFile}`);

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