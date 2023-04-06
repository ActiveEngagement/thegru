import path from 'path';
import { buildTree, renderTree } from '../content.js';
import transformContent from './transform_content.js';
import { readFile } from '../fs_util.js';
import { resolveLocalPath } from '../util.js';
import analysis from '../mdast_analysis.js';

/**
 * Syncs (creates or updates) the given card.
 */
export default async function(filePath, cardTitle, options) {
    const { logger, api, github, inputs, attachmentHandler, footer, existingCardIds, didFileChange } = options;

    logger.info(`Reading ${filePath}`);
    const content = await readFile(filePath);
    const contentTree = await buildTree(content, { logger, github, footer });

    // Extract the paths of referenced images from the Markdown file so that we can check whether they have changed.
    const imagePaths = [];
    analysis(contentTree)
        .eachImage(image => {
            if(!image.getUrl().startsWith('http')) {
                imagePaths.push(resolveLocalPath(image.getUrl(), path.dirname(filePath)));
            }
        })
        .doSync();
    
    const watchedFiles = [filePath, ...imagePaths];

    logger.debug('Checking whether any of the following files have changed:');
    watchedFiles.forEach((file) => logger.debug(`\t- ${file}`));

    // Check whether the Markdown file or any of its images have changed.
    const changed = watchedFiles.some(file => didFileChange(file));
    
    const cardId = existingCardIds[filePath];
    if(cardId && !changed) {
        // If there is an existing card, and it has not changed (to our knowledge), then we'll skip it.
        logger.info(`Skipping card ${cardId} because it has not changed.`);
        return cardId;
    }

    // Build the card content.
    const { tree: resultContentTree, attachments } = await transformContent(filePath, contentTree, {
        logger,
        api,
        github,
        footer,
        attachmentHandler
    });
    const builtContent = renderTree(resultContentTree);
    const wrappedContent = builtContent;

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

    if(cardId) {
        existingCard = await api.getCard(cardId);
    }

    if(existingCard && !existingCard.archived) {
        logger.info(`Updating previously uploaded card ${cardId}`);
        await api.updateCard(existingCard.id, {
            ...existingCard,
            title: cardTitle,
            content: wrappedContent,
            attachments: cardAttachments
        });

        return cardId;
    }
    else {
        if(cardId) {
            logger.info(`Previously uploaded card ${cardId} no longer exists. Creating a new one...`);
        }
        else {
            logger.info('No previously uploaded card found. Creating a new one...');
        }

        const { id } = await api.createCard({
            title: cardTitle,
            collectionId: inputs.collectionId,
            boardId: inputs.boardId,
            sectionId: inputs.boardSectionId,
            content: wrappedContent,
            attachments: cardAttachments
        });

        logger.info(`Card ${id} created.`);

        return id;
    }
}