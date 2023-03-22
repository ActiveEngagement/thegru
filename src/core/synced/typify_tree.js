import path from 'path';
import { traverse } from './tree_util.js';
import * as types from './container_types.js';
import { InvalidContainerConfigurationError } from '../error.js';

/**
 * Traverses the given tree and assigns container types (i.e. board, board group, or board section) to each container
 * node based on its position in the tree and the given preferred top-level container type.
 */
export default function(tree, options = {}) {
    const { logger, preferredContainer } = options;

    const preferredType = types.from(types.name, preferredContainer);

    if(preferredType === types.BOARD_SECTION) {
        throw new InvalidContainerConfigurationError('The preferred top-level container type "board_section" is not allowed, because Guru sections are only permitted beneath boards. You should change the preferred container type to "board" and set "rootContainer" in the card rule.');
    }

    // We'll do this one branch at a time, so that each top-level container can be the minimum required type.
    // This process could in theory be recursive, but it not as essential for the deeper levels because it is only board
    // groups that cannot contain cards, and it could lead to some slightly confusing behavior.
    for(const [rootName, node] of tree.children) {
        if(node.type === 'container') {
            const topType = analyzeBranch(rootName, node, { logger, preferredType });
            typifyBranch(node, topType);
        }
    }

    function analyzeBranch(rootName, node) {
        let height = 1;
        let firstLevelCard = null;

        traverse(node)
            .state('path', rootName)
            .state('depth', 1)
            .do((node, _name, state) => {
                if(node.type === 'container') {
                    if(state.depth > 3) {
                        throw new InvalidContainerConfigurationError(`The configured container "${state.path}" is too deep! Guru does not support more than 3 organizational levels.`);
                    }
                    if(state.depth > height) {
                        height = state.depth;
                    }
                }
                else {
                    if(state.depth == 2 && !firstLevelCard) {
                        firstLevelCard = state.path;
                    }
                }
            });

        let topType = preferredType;

        if(firstLevelCard && topType === types.BOARD_GROUP) {
            if(height === 3) {
                throw new InvalidContainerConfigurationError(`The configured container "${path.dirname(firstLevelCard)}" cannot contain the card "${firstLevelCard}"! Because the configured container structure is 3 levels deep, "${firstLevelCard}" would need to be a Guru board group, which cannot contain cards directly.`);
            }
            else {
                topType = types.BOARD;
            }
        }

        if(types.supportedDepth(topType) < height) {
            topType = types.from(types.supportedDepth, height - 1);
        }

        if(topType !== preferredType) {
            logger.warning(`The preferred top-level container type "${types.name(preferredType)}" could not be used for container "${rootName}". Using "${types.name(topType)}" instead.`);
        }

        return topType;
    }

    function typifyBranch(node, topType) {
        node.containerType = topType;

        traverse(node)
            .do((node, _name, state) => {
                if(node.type === 'container') {
                    node.containerType = types.from(types.level, types.level(topType) + state.depth);
                }
            });
    }
}