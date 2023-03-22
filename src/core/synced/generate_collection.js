import buildTree from './build_tree.js';
import informTree from './inform_tree.js';
import typifyTree from './typify_tree.js';
import flattenTree from './flatten_tree.js';
import * as content from '../content.js';
import transformContent from './transform_content.js';
import { ensureContainerPath, traversePath } from './tree_util.js';

export default async function(options) {
    const {
        logger,
        inputs,
        github,
        footer,
        attachmentHandler
    } = options;

    const tree = buildTree(inputs.cards, { logger });

    for(const [containerPath, info] of Object.entries(inputs.containers)) {
        const container = ensureContainerPath(tree, containerPath);
        Object.assign(container.info, info);
    }

    informTree(tree, { logger });

    typifyTree(tree, {
        logger,
        preferredContainer: inputs.preferredContainer
    });

    const collection = flattenTree(tree, { logger });
    const resources = [];

    for(const card of collection.cards) {
        const contentTree = content.buildTree(card.content, { logger, github, footer });
        const { tree: resultTree, attachments } = await transformContent(card.file, contentTree, {
            logger,
            github,
            cards: collection.cards,
            attachmentHandler
        });
        card.content = content.renderTree(resultTree);
        resources.push(...attachments);
    }

    return {
        tags: [],
        resources,
        ...collection
    };
}