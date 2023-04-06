import path from 'path';
import { traverse } from './util.js';
import * as types from '../container_types.js';
import { InvalidContainerConfigurationError } from '../../error.js';

/**
 * Traverses the given tree and assigns container types (i.e. board, board group, or board section) to each container
 * node based on its position in the tree and the given preferred top-level container type.
 */
export default function(tree, options = {}) {
    const { logger, preferredContainer } = options;

    const preferredType = types.from(types.name, preferredContainer);

    if(preferredType === types.BOARD_SECTION) {
        // This should never happen because of input validation, but we'll leave it here to prevent any future confusion.
        throw new InvalidContainerConfigurationError();
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

    /**
     * Determines the required top contiainer type for the given branch.
     */
    function analyzeBranch(rootName, node) {
        let height = 1; // Because this is a branch, we're one level down.
        let secondLevelCard = null;

        traverse(node)
            .state('path', rootName) // Because this is a branch, we're starting one name in.
            .state('depth', 1) //  Because this is a branch, we're starting one level down.
            .do((node, _name, state) => {
                if(node.type === 'container') {
                    // Ensure the maximum depth is not greater than 3.
                    if(state.depth > 3) {
                        throw new InvalidContainerConfigurationError(`The configured container "${state.path}" is too deep! Guru does not support more than 3 organizational levels.`);
                    }

                    // Eventually "height" will be the height of the tree.
                    if(state.depth > height) {
                        height = state.depth;
                    }
                }
                else {
                    if(state.depth == 2 && !secondLevelCard) {
                        // If there's a card on the second level, then its parent cannot be a board group.
                        // We'll therefore take note of that fact for later use.
                        //
                        // We'll also store the first second-level card in case things don't work out later on and we
                        // need to indicate to the user the offending card.
                        secondLevelCard = state.path;
                    }
                }
            });
        
        // Some of the following logic will kind of break down for more types than the ones we have.
        // Since it's highly unlikely that Guru will add more container types, we'll leave it for now.
        // We can revisit it later if necessary.

        let topType = preferredType;

        if(types.supportedDepth(topType) < height) {
            topType = types.from(types.supportedDepth, height - 1);
        }

        if(secondLevelCard && topType === types.BOARD_GROUP) {
            // If there's a card on the second level, then the top container can't be a board group.
            // We'll use a board if possible, or raise an error if we don't have enought levels without board groups.
            if(height === 3) {
                throw new InvalidContainerConfigurationError(`The configured container "${path.dirname(secondLevelCard)}" cannot contain the card "${secondLevelCard}"! Because the configured container structure is 3 levels deep, "${secondLevelCard}" would need to be a Guru board group, which cannot contain cards directly.`);
            }
            else {
                topType = types.BOARD;
            }
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