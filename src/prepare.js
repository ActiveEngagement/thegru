import { remark } from 'remark';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeSlug from 'rehype-slug';
import { analyzeTree } from './has_util.js';

export default async function (markdownInput, options = {}) {
    const getImageUrl = options.getImageUrl;

    function wrapMarkdown(markdownInput) {
        // The deprecated escape function is REQUIRED here, since Guru seems to use unescape on their end.
        return `<div class="ghq-card-content__markdown" data-ghq-card-content-type="MARKDOWN" data-ghq-card-content-markdown-content="${escape(markdownInput)}"></div>`;
    }

    function isLocalImage(node) {
        return !node.properties.src.startsWith('http');
    }

    async function rewriteLocalImage(node) {
        node.properties.src = await getImageUrl(node.properties.src);
    }

    function fixImageWidth(node) {
        node.properties.style = "width: auto;";
    }

    function plugin() {
        return async (tree) => {
            // This is necessary because the unist-util-visit visit method is not asynchronous.
            const analysis = analyzeTree(tree, { image: /img/ });

            for (const node of analysis.image) {
                if (isLocalImage(node)) {
                    await rewriteLocalImage(node);
                }
                fixImageWidth(node);
            }
        };
    }

    const output = await remark()
        .use(remarkParse)
        .use(remarkRehype)
        .use(plugin)
        .use(rehypeSlug)
        .use(rehypeStringify)
        .process(markdownInput);

    // If it seems peculiar that we're building the HTML, then wrapping it in a Guru Markdown block, that's because it
    // is. It's the only way I could find that caused Guru to permit HTML, however. Guru is crazy.
    
    return wrapMarkdown(String(output));
}