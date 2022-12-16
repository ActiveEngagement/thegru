import fs from 'fs';
import path from 'path';
import process from 'process';
import path from 'path';
import createApi from './api.js';
import prepare from './prepare.js';

export default async function(options) {
    const api = createApi({
        endpoint: options.guruEndpoint,
        userEmail: options.userEmail,
        userToken: options.userToken,
        logger: options.logger
    });

    async function getNewLocalImageUrl(url) {
        const parentDir = path.dirname(options.filePath);
        const previousDir = process.cwd();
        process.chdir(parentDir);

        const { link } = await api.uploadAttachment(path.basename(url), blobFromSync(url));

        process.chdir(previousDir);

        return link;
    }

    let content = await fs.promises.readFile(options.filePath);

    if (options.cardFooter) {
        content += "\n\n" + options.cardFooter;
    }

    content = await prepare(content, { getImageUrl: getNewLocalImageUrl });

    const existingCard = await api.getCardWith(
        options.cardTitle,
        options.collectionId,
        options.boardId,
        options.boardSectionId
    );

    if (existingCard) {
        await api.updateCard(existingCard.id, {
            ...existingCard,
            content
        });
    } else {
        await api.createCard({
            title: options.cardTitle,
            collectionId: options.collectionId,
            boardId: options.boardId,
            sectionId: options.boardSectionId,
            content
        });
    }
}