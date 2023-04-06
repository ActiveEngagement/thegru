import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';

//
// A few functions for conveniently working with `unified` MDAST steps individually, instead of as an entire pipeline.
//

/**
 * Parses Markdown content into an MDAST tree.
 */
export function buildTree(content, remarkOptions = undefined) {
    return unified()
        .use(remarkParse, remarkOptions)
        .parse(content);
}

/**
 * Renders an MDAST tree into Markdown content.
 */
export function renderTree(tree, remarkOptions = undefined) {
    const output = unified()
        .use(remarkStringify, remarkOptions)
        .stringify(tree);

    return String(output);
}