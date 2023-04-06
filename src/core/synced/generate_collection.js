import buildTree from './tree/build_tree.js';
import informTree from './tree/inform_tree.js';
import typifyTree from './tree/typify_tree.js';
import flattenTree from './tree/flatten_tree.js';
import * as content from '../content.js';
import transformContent from './transform_content.js';
import { ensureContainerPath } from './tree/util.js';
import linkHandler from './mdast_non_auto_link.js';
import attachFooter from '../attach_footer.js';
import analyze from '../unist_analyze.js';
import { image, imageReference, link, linkReference, definition } from '../mdast_predicates.js';

/**
 * Generates an object representing the new synced collection.
 * 
 * This function is arguably where most of the synced-collection-based logic occurs. It is intentionally separate from
 * the processes that generate a collection zip and upload it to Guru, for reasons of testability.
 */

export default async function(options) {
    const {
        logger,
        inputs,
        github,
        footer,
        attachmentHandler
    } = options;

    // Build the card/container tree from the provided card rules.
    const tree = buildTree(inputs.cards, { logger });

    // Ensure that each explicitly provided container is created and attach the provided info.
    for(const [containerPath, info] of Object.entries(inputs.containers)) {
        const container = ensureContainerPath(tree, containerPath);
        Object.assign(container.info, info);
    }

    // Traverse the tree and attaches info to each node.
    // Note that explicitly provided info (in either inputs.cards or inputs.containers) has already been attached above.
    informTree(tree, { logger });

    // Traverse the tree and determine each container's type (i.e. board, board group, or board section).
    // This is not entirely straightforward, since board groups cannot contain cards or board sections; therefore the
    // logic resides in its own file.
    typifyTree(tree, {
        logger,
        preferredContainer: inputs.preferredContainer
    });

    // Flatten the now-complete tree into cards, boards, and board groups.
    const { cards, boards, boardGroups } = flattenTree(tree, { logger });

    // Now, before we're finished, we need to transform each card's content in order to rewrite links, collect
    // resources, etc.

    const resources = [];
    for(const card of cards) {
        // Build an MDAST tree of the card's content (with the footer attached).
        const contentTree = content.buildTree(
            attachFooter(card.content, { logger, github, footer })
        );

        const analysis = analyze(contentTree, image, imageReference, link, linkReference, definition);

        // Transform the tree as appropriate for synced collections.
        const { attachments } = await transformContent(card.file, analysis, {
            logger,
            github,
            cards,
            tree,
            attachmentHandler
        });

        // Render the transformed tree to Markdown.
        // Pass a custom link handler to prevent autolinks (Guru doesn't like them for some reason).
        card.content = content.renderTree(contentTree, { handlers: { link: linkHandler }});

        // Collect any referenced attachments that were found while processing the content so we can upload them later.
        resources.push(...attachments);
    }

    return {
        tags: [], // Tags are currently unsupported, so we'll just return an empty array.
        cards,
        boards,
        boardGroups,
        resources
    };
}