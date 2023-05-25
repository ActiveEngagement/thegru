import path from 'path';
import fs from 'fs';
import { joinNames } from '../util.js';
import * as types from './container_types.js';
import { traverse } from './tree/util.js';
import transform from '../transform_content.js';
import rewriteAttachmentBase from '../rewrite_attachment.js';

export default async function(filePath, analysis, options = {}) {
    const { logger, github, cards, tree, attachmentHandler, isFileCommitted } = options;

    const attachments = [];

    async function rewriteAttachment(url, resolved, type, options) {
        return rewriteAttachmentBase(url, resolved, type, options);
    }

    async function upload(url, resolved) {
        let attachment = attachments.find(a => a.path === resolved);

        if(!attachment) {
            const id = resolved.replaceAll('/', '__');
            attachment = { id, path: resolved };
            attachments.push(attachment);
        }

        return path.join('resources', attachment.id);
    }

    async function rewriteImage(url, resolved) {
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
            logger, attachmentHandler, github, upload, isFileCommitted
        });
    }

    async function rewriteLink(url, resolved) {
        const card = cards.find(c => c.file === resolved);
        if(card) {
            return await getCardLink(card);
        }

        if(!fs.existsSync(resolved)) {
            logger.notice(`${filePath} referenced "${url}", which does not exist on the file system. We'll ignore it, but you likely have a broken link.`);
            return url;
        }

        const stat = await fs.promises.stat(resolved);

        if(stat.isDirectory()) {
            let container = null;
            let containerName = null;

            traverse(tree)
                .state('name', '')
                .do((node, name, state) => {
                    state.name = joinNames(state.name, name);

                    if(node.type === 'container' && node.file === resolved) {
                        container = node;
                        containerName = state.name;

                        return false;
                    }
                });

            if(!container) {
                logger.warning(`${filePath} referenced "${url}", which is a directory on the file system, but does not correspond to a Guru board, board section, or board group. We'll ignore it, but you likely have a broken link.`);
                return url;
            }

            return await getContainerLink(container, containerName, url);
        }

        return await rewriteAttachment(url, resolved, 'link', {
            logger, attachmentHandler, github, upload, isFileCommitted
        });
    }

    async function getCardLink(card) {
        return path.join('cards', card.name);
    }

    async function getContainerLink(container, name, url) {
        switch (container.containerType) {
        case types.BOARD_GROUP:
            return path.join('board-groups', name);
        case types.BOARD:
            return path.join('boards', name);
        case types.BOARD_SECTION:
            logger.warning(`${filePath} referenced "${url}", which is a Guru board section. Since Guru board sections can't be linked to, we'll ignore it, but you likely have a broken link.`);
            return url;
        }
    }

    await transform(filePath, analysis, {
        logger, attachmentHandler, github, rewriteLink, rewriteImage
    });

    return { attachments };
}