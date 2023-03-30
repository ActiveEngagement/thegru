import path from 'path';
import remarkStringify from 'remark-stringify';
import { unified } from 'unified';
import { resolveLocalPath } from '../util.js';
import analysis from '../mdast_analysis.js';

export default async function(filePath, contentTree, options = {}) {
    const { logger, api, github, attachmentHandler } = options;

    const attachments = [];

    function resolveUrl(url) {
        return resolveLocalPath(url, path.dirname(filePath));
    }

    async function uploadImage(url) {
        logger.info(`Uploading and rewriting local image ${url}`);

        const attachment = await api.uploadAttachment(path.basename(url), resolveUrl(url));
        attachments.push(attachment);

        return attachment.link;
    }

    function getGithubImageUrl(url) {
        logger.info(`Rewriting local image ${url}`);
        return 'https://raw.githubusercontent.com/' + path.join(github.repo.name, github.commit.sha, resolveUrl(url));
    }

    async function getImageUrl(url) {
        switch (attachmentHandler) {
        case 'upload':
            return await uploadImage(url);
        case 'github_urls':
            return getGithubImageUrl(url);
        }
    }

    function isLocalImage(url) {
        return !url.startsWith('http') && !url.startsWith('mailto');
    }

    async function transform(tree) {
        // This is necessary because the unist-util-visit visit method does not support asynchronous visitors.
        await analysis(tree)
            .eachImage(async(image) => {
                if(isLocalImage(image.getUrl())) {
                    image.setUrl(await getImageUrl(image.getUrl()));
                }
            })
            .do();
    }

    const transformedTree = await unified()
        .use(() => transform)
        .run(contentTree);
    
    const output = unified()
        .use(remarkStringify)
        .stringify(transformedTree);
    
    return { content: String(output), attachments };
}