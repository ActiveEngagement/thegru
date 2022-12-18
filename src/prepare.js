import { remark } from 'remark';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeSlug from 'rehype-slug';
import { analyzeTree } from './hast_util.js';

export default async function(markdownInput, options = {}) {
    const getImageUrl = options.getImageUrl;

    function isLocalImage(node) {
        return !node.properties.src.startsWith('http');
    }

    async function rewriteLocalImage(node) {
        node.properties.src = await getImageUrl(node.properties.src);
    }

    function fixImageWidth(node) {
        node.properties.style = "width: auto;";
    }

    async function transform(tree) {
        // This is necessary because the unist-util-visit visit method does not support asynchronous visitors.
        const analysis = analyzeTree(tree, { image: /img/ });

        for(const node of analysis.image) {
            if(isLocalImage(node)) {
                await rewriteLocalImage(node);
            }
            fixImageWidth(node);
        }
    }

    const output = await remark()
        // Parse the Markdown.
        .use(remarkParse)
        // Convert it to an HTML syntax tree.
        .use(remarkRehype)
        // Transform the syntax tree.
        .use(() => transform)
        // Make headings "navigable".
        .use(rehypeSlug)
        // Convert the syntax tree to an HTML string.
        .use(rehypeStringify)
        .process(markdownInput);
    
    return String(output);
}