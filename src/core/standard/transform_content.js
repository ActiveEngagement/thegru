import path from 'path';
import fs from 'fs';
import transform from '../transform_content.js';
import rewriteAttachmentBase from '../rewrite_attachment.js';

export default async function(filePath, analysis, options = {}) {
    const { logger, api, github, attachmentHandler } = options;

    const attachments = [];

    async function rewriteAttachment(url, resolved, type, options) {
        if(!fs.existsSync(resolved)) {
            logger.warning(`${filePath} referenced "${url}", which does not exist on the file system. We'll ignore it, but you likely have a broken link.`);
            return url;
        }

        const stat = await fs.promises.stat(resolved);

        if(stat.isDirectory()) {
            logger.warning(`${filePath} referenced "${url}", which is a directory. We'll ignore it, but you likely have a broken link.`);
            return url;
        }

        return rewriteAttachmentBase(url, resolved, type, options);
    }

    async function upload(url, resolved, type) {
        const attachment = await api.uploadAttachment(path.basename(url), resolved);
        attachments.push(attachment);

        return attachment.link;
    }

    async function rewriteLink(url, resolved) {
        return await rewriteAttachment(url, resolved, 'link', {
            logger, attachmentHandler, github, upload, cardFilePath: filePath
        });
    }

    async function rewriteImage(url, resolved) {
        return await rewriteAttachment(url, resolved, 'link', {
            logger, attachmentHandler, github, upload
        });
    }

    await transform(filePath, analysis, {
        logger, attachmentHandler, github, rewriteLink, rewriteImage
    });

    return { attachments };
}