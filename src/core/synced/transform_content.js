import path from 'path';
import fs from 'fs';
import { analyzeTree } from '../mdast_util.js';
import { resolveLocalPath } from '../util.js';
import { transformTree } from '../content.js';
import * as types from './container_types.js';

export default async function(filePath, contentTree, options = {}) {
    const { logger, github, cards, containers, attachmentHandler } = options;

    const attachments = [];

    function resolveUrl(url) {
        return resolveLocalPath(url, path.dirname(filePath));
    }

    async function upload(url) {
        const resolved = resolveUrl(url);

        let attachment = attachments.find(a => a.path === resolved);

        if(!attachment) {
            if (!fs.existsSync(resolved)) {
                logger.warning(`${filePath} referenced "${url}", which does not exist on the file system. We'll ignore it, but you likely have a broken link.`);
                return url;
            }

            const id = resolved.replaceAll('/', '__');
            attachment = { id, path: resolved };
            attachments.push(attachment);
        }

        return path.join('resources', attachment.id);
    }

    function getGithubUrl(url) {
        return 'https://raw.githubusercontent.com/' + path.join(github.repo.name, github.commit.sha, resolveUrl(url));
    }

    async function rewriteAttachment(url, type) {
        switch (attachmentHandler) {
        case 'upload':
            logger.info(`'Uploading and rewriting local ${type} ${url}`);
            return await upload(url);
        case 'github_urls':
            logger.info(`'Rewriting local ${type} ${url}`);
            return getGithubUrl(url);
        }
    }

    async function rewriteLink(url) {
        const resolved = resolveUrl(url);

        const card = cards.find(c => c.file === resolved);
        if(card) {
            return await getCardLink(card);
        }

        if (!fs.existsSync(resolved)) {
            logger.warning(`${filePath} referenced "${url}", which does not exist on the file system. We'll ignore it, but you likely have a broken link.`);
            return url;
        }

        const stat = await fs.promises.stat(resolved);

        if (stat.isDirectory()) {
            const container = containers.find(c => c.file === resolved);

            if(!container) {
                logger.warning(`${filePath} referenced "${url}", which is a directory on the file system, but does not correspond to a Guru board, board section, or board group. We'll ignore it, but you likely have a broken link.`);
                return url;
            }

            return await getContainerLink(container, url);
        }

        return await rewriteAttachment(url, 'link');
    }

    async function getCardLink(card) {
        return path.join('cards', card.name);
    }

    async function getContainerLink(container, url) {
        switch (container.containerType) {
            case types.BOARD_GROUP:
                return path.join('board-groups', container.name);
            case types.BOARD:
                return path.join('boards', container.name);
            case types.BOARD_SECTION:
                logger.warning(`${filePath} referenced "${url}, which is a Guru board section. Since Guru board sections can't be linked to, we'll ignore it, but you likely have a broken link.`);
                return url;
        }
    }

    function isLocal(url) {
        return !url.startsWith('http') && !url.startsWith('#');
    }

    const resultTree = await transformTree(contentTree, async(tree) => {
        // This is necessary because the unist-util-visit visit method does not support asynchronous visitors.
        const analysis = analyzeTree(tree, {
            image: 'image',
            link: 'link',
            imageReference: 'imageReference',
            linkReference: 'linkReference',
            definition: 'definition',
        });

        for(const node of analysis.image) {
            if(isLocal(node.url)) {
                node.url = await rewriteAttachment(node.url, 'image');
            }
        }

        for(const node of analysis.imageReference) {
            const definition = analysis.definition.find(n => n.identifier === node.identifier);
            if(isLocal(definition.url)) {
                definition.url = await rewriteAttachment(definition.url, 'image');
            }
        }

        for(const node of analysis.link) {
            if(isLocal(node.url)) {
                node.url = await rewriteLink(node.url);
            }
        }

        for(const node of analysis.linkReference) {
            const definition = analysis.definition.find(n => n.identifier === node.identifier);
            if(isLocal(definition.url)) {
                definition.url = await rewriteLink(definition.url);
            }
        }
    });

    return { tree: resultTree, attachments };
}