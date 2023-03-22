import path from 'path';
import cardTree from './build_tree.js';
import { buildTree, renderTree } from '../content.js';
import transformContent from './transform_content.js';
import { traverse, traversePath } from './tree_util.js';
import typify from './typify_tree.js';
import flatten from './flatten_tree.js';
import { stripExtension } from '../fs_util.js';

export default async function(options) {
    const {
        logger,
        inputs,
        github,
        footer,
        attachmentHandler
    } = options;

    const tree = cardTree(inputs.cards, { logger });

    for(const [container, info] of Object.entries(inputs.containers)) {
        traversePath(tree, container)
            .makeParents()
            .onCreate((node, ctx) => {
                node.info.title ||= path.basename(ctx.path);
                Object.assign(node.info, info);
            })
            .do();
    }

    traverse(tree)
        .do((node) => {
            if (node.type === 'card') {
                node.info.title ||= stripExtension(path.basename(node.file));
            }
        });

    typify(tree, {
        logger,
        preferredContainer: inputs.preferredContainer
    });

    const collection = flatten(tree, { logger });
    const resources = [];

    for(const card of collection.cards) {
        const contentTree = buildTree(card.content, { logger, github, footer });
        const { tree: resultTree, attachments } = await transformContent(card.file, contentTree, {
            logger,
            github,
            cards: collection.cards,
            attachmentHandler
        });
        card.content = renderTree(resultTree);
        resources.push(...attachments);
    }

    return {
        tags: [],
        resources,
        ...collection
    };
}