import path from 'path';
import buildContentTree from './build_content_tree.js';
import buildContent from './build_content.js';
import { readFile } from './fs_util.js';
import { analyzeTree } from './hast_util.js';
import guruMdBlock from './guru_md_block.js';
import { resolveLocalPath } from './util.js';

export default async function(filePath, cardTitle, options) {
    const { logger, api, github, inputs, imageHandler, footer, existingCardIds, didFileChange } = options;

    logger.info(`Reading ${filePath}`);
    const content = await readFile(filePath);
    const contentTree = await buildContentTree(content, { logger, github, footer });

    // Extract the paths of referenced images from the Markdown file so that we can check whether they have changed.
    const imagePaths = analyzeTree(contentTree, { image: /img/ }).image
        .map(node => resolveLocalPath(node.properties.src, path.dirname(filePath)));
    
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
    const { content: builtContent, attachments } = await buildContent(filePath, contentTree, {
        logger,
        api,
        github,
        footer,
        imageHandler
    });
    const wrappedContent = guruMdBlock(builtContent);

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
            attachments
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
            attachments
        });

        logger.info(`Card ${id} created.`);

        return id;
    }
}