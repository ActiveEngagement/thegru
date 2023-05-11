import path from 'path';
import { buildTree, renderTree } from '../content.js';
import transformContent from './transform_content.js';
import { readFile } from '../fs_util.js';
import { resolveLocalPath } from '../util.js';
import analyze from '../unist_analyze.js';
import { image, imageReference, definition, link, linkReference } from '../mdast_predicates.js';
import { unifyImages } from '../mdast_unify.js';
import attachFooter from '../attach_footer.js';

/**
 * Syncs (creates or updates) the given card.
 */
export default async function(card, options) {
    const { logger, api, github, inputs, attachmentHandler, footer, existingCardIds } = options;

    if(typeof card === 'string') {
        card = { path: card };
    }

    const filePath = card.path;
    let cardTitle = card.title;
    let key = card.key;

    logger.startGroup(key);

    if(!cardTitle) {
        cardTitle = inferTitle(cardTitle);
    }

    if(!key) {
        key = filePath;
    }

    logger.info(`Reading ${filePath}`);
    const content = await readFile(filePath);
    const contentTree = buildTree(attachFooter(content, { logger, github, footer }));

    const analysis = analyze(contentTree, image, imageReference, definition, link, linkReference);
    
    const cardId = existingCardIds[key];

    // Build the card content.
    const { attachments } = await transformContent(filePath, analysis, {
        logger,
        api,
        github,
        footer,
        attachmentHandler
    });
    const builtContent = renderTree(contentTree);
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

        return { key, id: cardId };
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

        return { key, id };
    }
}