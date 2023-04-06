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
        if(!fs.existsSync(resolved)) {
            logger.warning(`${filePath} referenced "${url}", which does not exist on the file system. We'll ignore it, but you likely have a broken link.`);
            return url;
        }

        const stat = await fs.promises.stat(resolved);

        if(stat.isDirectory()) {
            logger.warning(`${filePath} referenced "${url}", which is a directory. We'll ignore it, but you likely have a broken link.`);
            return url;
        }

        return await rewriteAttachment(url, resolved, 'link', {
            logger, attachmentHandler, github, upload
        });
    }

    await transform(filePath, analysis, {
        logger, attachmentHandler, github, rewriteLink, upload
    });

    return { attachments };
}