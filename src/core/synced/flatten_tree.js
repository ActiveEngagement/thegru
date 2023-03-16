import path from 'path';
import { joinNames } from '../util.js';
import { types } from './container_types.js';
import { traverse } from './tree_util.js';

export default function(tree) {
    const cards = [];
    const boards = [];
    const boardGroups = [];
    
    function boardItems(board, boardPath, boardFullName) {
        return Array.from(board.children).map(([name, node]) => {
            const fullName = joinNames(boardFullName, name);
            const fullPath = path.join(boardPath, name);
            switch (node.type) {
            case 'card':
                return {
                    id: fullName,
                    type: 'card'
                };
            case 'container':
                if (node.info.description) {
                    logger.warning(`The container "${fullPath}" cannot be given the description "${node.info.description}" because it is a Guru board section, which cannot have a description.`);
                }
                if (node.info.externalUrl) {
                    logger.warning(`The container "${fullPath}" cannot be given the external URL "${$node.info.externalUrl}" because it is a Guru board section, which cannot have an external URL.`);
                }
                return {
                    type: 'section',
                    title: node.info.title,
                    items: boardItems(node, fullPath, fullName)
                };
            }
        });
    }
    
    traverse(tree)
        .state('fullName', '')
        .do((node, name, state) => {
            state.fullName = joinNames(state.fullName, name);

            if (node.type === 'card') {
                cards.push({
                    name: state.fullName,
                    ...node.info,
                    content: node.content,
                    path: state.path
                });
            } else if (node.type === 'container') {
                switch (node.containerType) {
                case types.BOARD_GROUP:
                    boardGroups.push({
                        name: state.fullName,
                        ...node.info,
                        boards: Array.from(node.children.keys()).map(k => joinNames(state.fullName, k)),
                        path: state.path
                    });
                    break;
                case types.BOARD:
                    boards.push({
                        name: state.fullName,
                        ...node.info,
                        items: boardItems(node, state.path, state.fullName),
                        path: state.path
                    });
                }
            }
        });
    
    return { cards, boards, boardGroups };
}