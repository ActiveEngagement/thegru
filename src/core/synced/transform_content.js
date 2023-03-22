import path from 'path';
import { analyzeTree } from '../mdast_util.js';
import { resolveLocalPath } from '../util.js';
import { transformTree } from '../content.js';

export default async function(filePath, contentTree, options = {}) {
    const { logger, github, cards, attachmentHandler } = options;

    const attachments = [];

    function resolveUrl(url) {
        return resolveLocalPath(url, path.dirname(filePath));
    }

    async function upload(url) {
        const resolved = resolveUrl(url);

        if(!attachments.includes(resolved)) {
            attachments.push(resolved);
        }

        return path.join('resources', resolved);
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

    async function getCardLink(card) {
        return path.join('cards', card.name);
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
                const card = cards.find(c => c.file === resolveUrl(node.url));
                if(card) {
                    node.url = await getCardLink(card);
                }
                else {
                    node.url = await rewriteAttachment(node.url, 'link');
                }
            }
        }

        for(const node of analysis.linkReference) {
            const definition = analysis.definition.find(n => n.identifier === node.identifier);
            if(isLocal(definition.url)) {
                const card = cards.find(c => c.file === resolveUrl(definition.url));
                if(card) {
                    definition.url = await getCardLink(card);
                }
                else {
                    definition.url = await rewriteAttachment(definition.url, 'link');
                }
            }
        }
    });

    return { tree: resultTree, attachments };
}