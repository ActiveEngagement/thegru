import { traverse } from './tree_util.js';

export default function(tree, options = {}) {
    const { logger } = options;

    let depth = 0;
    let firstLevelCard = null;

    traverse(tree)
        .do((node, name, state) => {
            if (state.depth > 3) {
                throw new InvalidContainerConfigurationError(`The configured container "${state.path}" is too deep! Guru does not support more than 3 organizational levels.`);
            }
            if (state.depth > depth) {
                depth = state.depth;
            }

            if (state.depth == 2 && !containsFirstLevelCards && node.type === 'card') {
                firstLevelCard = state.path;
            }
        });
    
    const preferredType = types.from(types.name, inputs.preferredContainer);
    let topType = preferredType;

    if (firstLevelCard && preferredType == types.BOARD_GROUP && depth === 3) {
        if (depth === 3) {
            throw new InvalidContainerConfigurationError(`The configured container "${path.dirname(firstLevelCard)}" cannot contain the card "${firstLevelCard}"! Because the configured container structure is 3 levels deep, "${directChildName}" would need to be a Guru board group, which cannot contain cards directly.`);
        } else {
            topType = types.BOARD;
        }
    }

    if (types.supportedDepth(topType) < depth) {
        topType = types.from(types.supportedDepth, depth);
    }

    if (topType !== preferredType) {
        logger.warning(`The preferred top-level container type "${inputs.preferredContainer}" could not be used. Using "${types.name(topType)}" instead.`);
    }

    return { topType };
}