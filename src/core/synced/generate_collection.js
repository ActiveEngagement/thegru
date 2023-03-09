import cardTree from './build_tree.js';
import buildContentTree from '../build_content_tree.js';
import { unified } from 'unified';
import { analyzeTree } from '../mdast_util.js';
import { traversePath } from './tree_util.js';
import analyze from './analyze_tree.js';
import flatten from './flatten_tree.js';

export default async function(options) {
    const {
        api,
        logger,
        colors,
        inputs,
        github,
        footer
    } = options;

    const tree = cardTree(inputs.cards, { logger });

    for (const [container, info] of Object.entries(inputs.containers)) {
        traversePath(tree, container)
            .makeParents()
            .onCreate(node => {
                Object.assign(node.info, info);
            })
            .do();
    }

    const { topType } = analyze(tree, { logger });
    const collection = flatten(tree, topType);

    for (const card of cards) {
        const contentTree = await buildContentTree(card.content);
        card.content = await buildContent(contentTree, card.file, {

        });
    }

    return {
        tags: [],
        ...collection
    };
}