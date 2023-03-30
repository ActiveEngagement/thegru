import path from 'path';
import { analyzeTree } from '../mdast_util.js';
import { resolveLocalPath } from '../util.js';
import { transformTree } from '../content.js';

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

    function isLocalImage(node) {
        return !node.url.startsWith('http') && !node.url.startsWith('mailto');
    }

    async function rewriteLocalImage(node) {
        node.url = await getImageUrl(node.url);
    }

    const resultTree = await transformTree(contentTree, async(tree) => {
        // This is necessary because the unist-util-visit visit method does not support asynchronous visitors.
        const analysis = analyzeTree(tree, { image: 'image' });

        for(const node of analysis.image) {
            if(isLocalImage(node)) {
                await rewriteLocalImage(node);
            }
        }
    });

    return { tree: resultTree, attachments };
}