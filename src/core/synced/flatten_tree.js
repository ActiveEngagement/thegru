import path from 'path';
import { joinNames } from '../util.js';
import * as types from './container_types.js';
import { traverse } from './tree.js';

/**
 * Flattens the given card/container tree into arrays of cards, boards, and board groups, which is closer to the format
 * Guru expects.
 * 
 * Note that the tree MUST have been previously "typified". Every container node must have a "containerType" property.
 */

export default function(tree, options) {
    const { logger } = options;

    const cards = [];
    const boards = [];
    const boardGroups = [];
    
    /**
     * Creates the appropriate list of items that the given board should have. The reason that this is its own function
     * is that it is potentially recursive if a board contains a section which contains its own items. A board section's
     * items are formatted exactly like a board's. This function could perhaps be more properly
     * `boardOrBoardSectionItems(boardOrBoardSection, boardOrBoardSectionPath, boardOrBoardSectionFullName)`. But no
     * one wants that.
     * 
     * This could have been an anonymous function but I hate immediately-called anonymous functions, so there you have
     * it.
     * 
     * Note that boardFullName is necessary for logging.
     */
    function boardItems(board, boardPath, boardFullName) {
        return Array.from(board.children).map(([name, node]) => {
            // Given the path to the board/section and the full name of the board/section, derive the name and path of
            // the new section or card
            const fullName = joinNames(boardFullName, name);
            const fullPath = path.join(boardPath, name);

            switch (node.type) {
            case 'card':
                return {
                    id: fullName,
                    type: 'card'
                };
            case 'container':
                // This has to be a board section.

                if(node.info.description) {
                    logger.warning(`The container "${fullPath}" cannot be given the description "${node.info.description}" because it is a Guru board section, which cannot have a description.`);
                }
                if(node.info.externalUrl) {
                    logger.warning(`The container "${fullPath}" cannot be given the external URL "${node.info.externalUrl}" because it is a Guru board section, which cannot have an external URL.`);
                }

                return {
                    type: 'section',
                    title: node.info.title,
                    items: boardItems(node, fullPath, fullName)
                };
            }
        });
    }
    
    // Traverse the tree (keeping track of the full names of each node) and generate an appropriate entry in cards,
    // boards, or boardGroups for each node.
    traverse(tree)
        .state('fullName', '')
        .do((node, name, state) => {
            state.fullName = joinNames(state.fullName, name);

            if(node.type === 'card') {
                // Cards are easy. Just append each one to cards.
                cards.push({
                    name: state.fullName,
                    info: node.info,
                    content: node.content,
                    file: node.file,
                    path: state.path
                });
            }
            else if(node.type === 'container') {
                switch (node.containerType) {
                case types.BOARD_GROUP:
                    // Board groups need to be pushed to boardGroups, but we need a list of their boards first.

                    // We'll iterate over the name of each child and join it with the full name of this board group.
                    // That will get us the full names of the boards, as expected by Guru.
                    const childBoards = Array.from(node.children.keys()).map(k => joinNames(state.fullName, k));

                    boardGroups.push({
                        name: state.fullName,
                        info: node.info,
                        boards: childBoards,
                        path: state.path
                    });
                    break;
                case types.BOARD:
                    // Boards need to be pushed to boards, along with a list of their "items" (cards and child board
                    // sections), which we generate with the recursive boardItems()
                    boards.push({
                        name: state.fullName,
                        info: node.info,
                        items: boardItems(node, state.path, state.fullName),
                        path: state.path
                    });
                    break;
                }
            }
        });
    
    return { cards, boards, boardGroups };
}