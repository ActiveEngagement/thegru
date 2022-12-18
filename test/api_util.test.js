import { flattenBoardCards } from '../src/api_util.js';

describe('flattenBoardCards', () => {
    test('flattens correctly', () => {
        const actual = flattenBoardCards([
            {
                type: 'fact',
                id: 'fact123'
            },
            {
                type: 'section',
                id: 'section123',
                items: []
            },
            {
                type: 'section',
                id: 'section456',
                items: [
                    {
                        type: 'fact',
                        id: 'fact456'
                    },
                    {
                        type: 'nonexistent',
                        id: 'na'
                    }
                ]
            }
        ]);
        expect(actual).toEqual([
            {
                type: 'fact',
                id: 'fact123'
            },
            {
                type: 'fact',
                id: 'fact456',
                sectionId: 'section456'
            }
        ]);
    });
});