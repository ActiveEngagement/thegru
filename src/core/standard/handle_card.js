import path from 'path';
import { readFile } from '../fs_util.js';
import buildContent from './build_content.js';

/**
 * Syncs (creates or updates) the given card.
 */
export default async function(filePath, title, existingId, options) {
    const { logger, api, github, inputs, attachmentHandler, footer, isFileCommitted } = options;

    logger.info(`Reading ${filePath}`);
    const { content, attachments } = await buildContent(readFile(filePath), {
        logger,
        api,
        github,
        footer,
        attachmentHandler,
        filePath,
        isFileCommitted
    });

    // It is necessary to transform the attachments slightly because of Guru craziness.
    // For whatever reason, the schema that a card's `attachments` have is subtly different than the schema of the
    // attachment returned by the upload endpoint.
    const cardAttachments = attachments.map((attachment) => ({
        extension: path.extname(attachment.filename).substring(1),
        filename: attachment.filename,
        id: attachment.attachmentId,
        link: attachment.link,
        mimetype: attachment.mimeType, // Nope, this is NOT a typo.
        size: attachment.size
    }));

    let existingCard = null;

    if(existingId) {
        existingCard = await api.getCard(existingId);
    }

    if(existingCard && !existingCard.archived) {
        logger.info(`Updating previously uploaded card ${existingId}`);
        await api.updateCard(existingCard.id, {
            ...existingCard,
            title,
            content,
            attachments: cardAttachments
        });

        return existingId;
    }
    else {
        if(existingId) {
            logger.info(`Previously uploaded card ${existingId} no longer exists. Creating a new one...`);
        }
        else {
            logger.info('No previously uploaded card found. Creating a new one...');
        }

        const { id } = await api.createCard({
            title,
            collectionId: inputs.collectionId,
            boardId: inputs.boardId,
            sectionId: inputs.boardSectionId,
            content,
            attachments: cardAttachments
        });

        logger.info(`Card ${id} created.`);

        return id;
    }
}