import path from 'path';
import { remark } from 'remark';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeSlug from 'rehype-slug';
import { analyzeTree } from './hast_util.js';
import { unified } from 'unified';
import { resolveLocalPath } from './util.js';

/**
 * Builds the content for a Markdown card file. The process looks like this:
 *   1. If given, the footer template will be built and appended to the content.
 *   2. The Markdown will be rendered to HTML.
 *   3. All local images will be rewritten based on the given image handler, either:
 *      * to point to public GitHub URLs, or
 *      * to point to a Guru attachment that will be created.
 *   4. All headings will receive an `id` attribute so that internal links function properly.
 */

export default async function(filePath, contentTree, options = {}) {
    const { logger, api, github, imageHandler } = options;

    function resolveUrl(url) {
        return resolveLocalPath(url, path.dirname(filePath));
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

    const transformedTree = await unified()
        .use(() => transform)
        .use(rehypeSlug)
        .run(contentTree);
    
    const output = unified()
        .use(rehypeStringify)
        .stringify(transformedTree);
    
    return String(output);
}