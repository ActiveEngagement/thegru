import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import buildContent from './build_content.js';
import { readFile } from './fs_util.js';
import { analyzeTree } from './hast_util.js';
import { pick } from './util.js';

export default async function(options) {
    const { api, logger } = options;

    if(options.imageHandler === 'auto') {
        options.imageHandler = options.github.isPublic ? 'github_urls' : 'upload';
    }

    const cardId = options.existingCardIds[options.filePath];
    
    const initialTree = unified().use(remarkParse).parse(await readFile(options.filePath));
    const tree = await unified().use(remarkRehype).run(initialTree);
    const imagePaths = analyzeTree(tree, { image: /img/ }).image.map(node => node.properties.src);
    
    if(cardId && ![options.filePath, ...imagePaths].some(file => options.didFileChange(file))) {
        logger.info(`Skipping card ${cardId} because it has not changed.`);
        return cardId;
    }

    const content = await buildContent(options.filePath, {
        ...pick(options,
            { footer: 'cardFooter' },
            { defaultFooter: 'defaultCardFooter' },
            'logger',
            'imageHandler',
            'github'
        ),
        api
    });

    let existingCard = null;

    if(cardId) {
        existingCard = await api.getCard(cardId);
    }

    if(existingCard && !existingCard.archived) {
        logger.info(`Updating previously uploaded card ${cardId}`);
        await api.updateCard(existingCard.id, {
            ...existingCard,
            content
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
            title: options.cardTitle,
            collectionId: options.collectionId,
            boardId: options.boardId,
            sectionId: options.boardSectionId,
            content
        });

        logger.info(`Card ${id} created.`);

        return id;
    }
}