import fs from 'fs';
import { blobFromSync } from 'node-fetch';
import path from 'path';
import process from 'process';
import { wrapGuruMarkdown } from './api_util.js';
import prepare from './prepare.js';
import createApi from './api.js';

export default async function(options) {
    options.logger ||= {
        debug() {}
    };

    const api = createApi(options.client, {
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

    if(options.cardFooter === undefined || options.cardFooter === null || options.cardFooter === true) {
        options.cardFooter = options.defaultCardFooter;
    }

    if(options.cardFooter && typeof options.cardFooter === 'string') {
        options.cardFooter = options.cardFooter.replaceAll('{{repository_url}}', options.repositoryUrl);
        content += "\n\n" + options.cardFooter;
    }

    content = wrapGuruMarkdown(await prepare(content, { getImageUrl: getNewLocalImageUrl }));

    const existingCard = await api.getCardWith(
        options.cardTitle,
        options.collectionId,
        options.boardId,
        options.boardSectionId
    );

    if(existingCard) {
        delete existingCard.sectionId;
        await api.updateCard(existingCard.id, {
            ...existingCard,
            content
        });
    }
    else {
        await api.createCard({
            title: options.cardTitle,
            collectionId: options.collectionId,
            boardId: options.boardId,
            sectionId: options.boardSectionId,
            content
        });
    }
}