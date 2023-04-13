import buildTree from './tree/build.js';
import informTree from './tree/inform.js';
import typifyTree from './tree/typify.js';
import flattenTree from './tree/flatten.js';
import { ensureContainerPath } from './tree/util.js';
import rewrite from './rewrite_cards.js';

/**
 * Generates an object representing the new synced collection.
 * 
 * This function is arguably where most of the synced-collection-based logic occurs. It is intentionally separate from
 * the processes that generate a collection zip and upload it to Guru, for reasons of testability.
 */

export default async function(options) {
    const {
        logger,
        colors,
        inputs,
        github,
        footer,
        attachmentHandler
    } = options;

    logger.info(' ');

    // Build the card/container tree from the provided card rules.
    logger.startGroup('Read the cards config');
    const tree = buildTree(inputs.cards, { logger, colors });
    logger.endGroup();

    logger.startGroup('Read the containers config');
    const containerEntries = Object.entries(inputs.containers);

    if (containerEntries.length > 0) {
        logger.info(`Found these containers in the config:`);
    } else {
        logger.info('No containers found in the config.');
    }

    // Ensure that each explicitly provided container is created and attach the provided info.
    logger.indent();
    for(const [containerPath, info] of containerEntries) {
        logger.info(containerPath);
        logger.trace(`  Info: ${JSON.stringify(info)}`);

        const container = ensureContainerPath(tree, containerPath);
        Object.assign(container.info, info);
    }
    logger.unindent();
    logger.endGroup();

    // Traverse the tree and attach info to each node.
    // Note that explicitly provided info (in either inputs.cards or inputs.containers) has already been attached above.
    logger.startGroup('Look for card/container info');
    informTree(tree, { logger, colors });
    logger.endGroup();

    // Traverse the tree and determine each container's type (i.e. board, board group, or board section).
    // This is not entirely straightforward, since board groups cannot contain cards or board sections; therefore the
    // logic resides in its own file.
    logger.startGroup('Designate containers as boards or board groups');
    typifyTree(tree, {
        logger,
        colors,
        preferredContainer: inputs.preferredContainer
    });
    logger.endGroup();

    // Flatten the now-complete tree into cards, boards, and board groups.
    const { cards, boards, boardGroups } = flattenTree(tree, { logger });

    // Now we need to transform each card's content in order to rewrite links, collect resources, etc.
    logger.info(' ');
    logger.info(colors.bold('Rewriting card content...'));
    logger.info(' ');
    const resources = await rewrite(cards, {
        logger,
        colors,
        github,
        attachmentHandler,
        footer,
        tree
    });

    return {
        tags: [], // Tags are currently unsupported, so we'll just return an empty array.
        cards,
        boards,
        boardGroups,
        resources
    };
}