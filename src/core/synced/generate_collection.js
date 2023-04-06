import buildTree from './build_tree.js';
import informTree from './inform_tree.js';
import typifyTree from './typify_tree.js';
import flattenTree from './flatten_tree.js';
import * as content from '../content.js';
import transformContent from './transform_content.js';
import { ensureContainerPath } from './tree_util.js';
import link from './mdast_non_auto_link.js';
import { unified } from 'unified';
import remarkStringify from 'remark-stringify';

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
            tree,
            attachmentHandler
        });

        const output = unified()
            .use(remarkStringify)
            .stringify(resultTree);
        card.content = String(output);

        resources.push(...attachments);
    }

    return {
        tags: [],
        resources,
        ...collection
    };
}