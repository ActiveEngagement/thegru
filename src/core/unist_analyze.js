import { visit } from 'unist-util-visit';
import { is } from 'unist-util-is';
import { TheGuruError } from './error.js';

/**
 * "Analyzes" a UNIST tree.
 * 
 * Because we only really want to visit a tree once, this function allows us to collect nodes of a certain type and
 * reuse them. Note that this would break down if we were to actually add or remove nodes from the tree, which we do
 * not currently do.
 */
export default function(tree, ...tests) {
    const nodes = tests.map(() => []);

    visit(tree, (node, index, parent) => {
        for(let i = 0; i < tests.length; i++) {
            if(is(node, tests[i], index, parent)) {
                nodes[i].push(node);
            }
        }
    });

    return createAnalysis(tests, nodes);
}

export function analysisBuilder() {
    const tests = [];
    const allNodes = [];

    function add(test, nodes = []) {
        const existingIndex = tests.findIndex(t => test === t);

        if(existingIndex < 0) {
            tests.push(test);
            allNodes.push(nodes);
        }
        else {
            allNodes[existingIndex].push(...nodes);
        }

        return this;
    }

    function build() {
        return createAnalysis(tests, allNodes);
    }

    return { add, build };
}

export function createAnalysis(tests, nodes) {
    function get(test) {
        const index = tests.findIndex(t => test === t);
        return index >= 0 ? nodes[index] : null;
    }

    return { get };
}

export function validate(analysis, ...required) {
    for(const key of required) {
        if(!analysis.get(key)) {
            throw new TheGuruError(`The tree analysis does not contain the required key "${key}". This should never happen and is certainly a bug.`);
        }
    }
}