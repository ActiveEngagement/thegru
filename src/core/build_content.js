import path from 'path';
import { remark } from 'remark';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeSlug from 'rehype-slug';
import { analyzeTree } from './hast_util.js';

/**
 * Builds the content for a Markdown card file. The process looks like this:
 *   1. If given, the footer template will be built and appended to the content.
 *   2. The Markdown will be rendered to HTML.
 *   3. All local images will be rewritten based on the given image handler, either:
 *      * to point to public GitHub URLs, or
 *      * to point to a Guru attachment that will be created.
 *   4. All headers will receive an `id` attribute so that internal links function properly.
 */

export default async function(filePath, content, options = {}) {
    const { logger, api, github, footer: footerTemplate, imageHandler } = options;

    if(footerTemplate && typeof footerTemplate === 'string') {
        const footer = footerTemplate.replaceAll('{{repository_url}}', github.repo.url);
        content += '\n\n' + footer;
    }
    else {
        logger.info('Skipping card footer...');
    }

    function resolveUrl(url) {
        if(url.startsWith('/')) {
            return url.substring(1);
        }
        return path.join(path.dirname(filePath), url);
    }

    async function uploadImage(url) {
        logger.info(`Uploading and rewriting local image ${url}`);

        const { link } = await api.uploadAttachment(path.basename(url), resolveUrl(url));

        return link;
    }

    function getGithubImageUrl(url) {
        logger.info(`Rewriting local image ${url}`);
        return 'https://raw.githubusercontent.com/' + path.join(github.repo.name, github.commit.sha, resolveUrl(url));
    }

    async function getImageUrl(url) {
        switch (imageHandler) {
        case 'upload':
            return await uploadImage(url);
        case 'github_urls':
            return getGithubImageUrl(url);
        }
    }

    function isLocalImage(node) {
        return !node.properties.src.startsWith('http');
    }

    async function rewriteLocalImage(node) {
        node.properties.src = await getImageUrl(node.properties.src);
    }

    function fixImageWidth(node) {
        node.properties.style = 'width: auto;';
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
        .process(content);
    
    return String(output);
}