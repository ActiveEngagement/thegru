import { traverse } from './util.js';
import * as content from '../../content.js';
import attachFooter from '../../attach_footer.js';
import analyze from '../../unist_analyze.js';
import { image, imageReference, link, linkReference, definition } from '../../mdast_predicates.js';
import transformContent from '../transform_content.js';
import linkHandler from '../mdast_non_auto_link.js';

export default async function(tree, options) {
    const {
        logger,
        github,
        cards,
        attachmentHandler
    } = options;

    const resources = [];

    async function rewriteCard(card) {
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

    const topLevelCards = [];

    for (const [name, node] of tree.children) {
        if (node.type === 'container') {
            logger.startGroup(name);
            await traverse(node).doAsync(async(name, node, state) => {
                if (node.type === 'card') {
                    await rewriteCard(node);
                }
            });
            logger.endGroup();
        } else {
            topLevelCards += { name, node };
        }
    }

    if (topLevelCards.length > 0) {
        logger.startGroup('Top-level cards');
        for (const card of topLevelCards) {
            await rewriteCard(card);
        }
        logger.endGroup();
    }

    return resources;
}