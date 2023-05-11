import path from 'path';
import fs from 'fs';
import transform from '../transform_content.js';
import rewriteAttachment from '../rewrite_attachment.js';

export default async function(filePath, analysis, options = {}) {
    const { logger, api, github, attachmentHandler } = options;

    const attachments = [];

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

    await transform(filePath, analysis, {
        logger, attachmentHandler, github, rewriteLink, upload
    });

    return { attachments };
}