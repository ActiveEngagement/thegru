import path from 'path';
import { resolveLocalPath } from '../util.js';
import { validate } from '../unist_analyze.js';
import { definition, image, imageReference } from '../mdast_predicates.js';
import { unifyImages } from '../mdast_unify.js';

export default async function(filePath, analysis, options = {}) {
    validate(analysis, image, imageReference, definition);

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

    for (const image of unifyImages(analysis)) {
        if(isLocalImage(image.getUrl())) {
            image.setUrl(await getImageUrl(image.getUrl()));
        }
    }

    return { attachments };
}