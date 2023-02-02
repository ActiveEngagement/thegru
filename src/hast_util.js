import { visit, CONTINUE as UNIST_CONTINUE } from 'unist-util-visit';

/**
 * Recursively visits a HAST tree and aggregates the given elements. Elements that match a given test will be returned
 * under the correspnding name.
 */

export function analyzeTree(tree, tags) {
    const analysis = {};

    for(const name of Object.keys(tags)) {
        analysis[name] = [];
    }

    visit(tree, (node, _index, parent) => {
        for(const [name, test] of Object.entries(tags)) {
            if(test.test(node.tagName)) {
                node.parent = parent;
                analysis[name].push(node);
            }
        }

        return UNIST_CONTINUE;
    });

    return analysis;
}