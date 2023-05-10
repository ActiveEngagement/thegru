import path from 'path';
import { unifyBoth } from './mdast_unify.js';
import { isLocalUrl, urlType, wrapMdBlock } from './util.js';
import { resolveLocalPath } from './util.js';
import { definition, image, imageReference, link, linkReference, heading } from './mdast_predicates.js';
import { validate } from './unist_analyze.js';
import rewriteAttachment from './rewrite_attachment.js';
import Slugger from 'github-slugger';
import { toString } from 'mdast-util-to-string';
import { renderTree } from './content.js';

export default async function(filePath, analysis, options) {
    validate(analysis, link, linkReference, image, imageReference, definition, heading);

    const { logger, attachmentHandler, github, upload, rewriteLink } = options;

    const slugger = new Slugger();

    function resolveUrl(url) {
        return resolveLocalPath(url, path.dirname(filePath));
    }

    async function rewriteImage(url, resolved) {
        return await rewriteAttachment(url, resolved, 'image', {
            logger, attachmentHandler, github, upload
        });
    }

    for(const headingNode of analysis.get(heading)) {
        const text = toString(headingNode);
        const slug = slugger.slug(text);
        logger.trace(`Appending anchor to heading`);
        logger.trace(`Heading text: ${text}`);
        logger.trace(`Derived slug: ${slug}`);
        headingNode.parent.children.splice(headingNode.index, 0, {
            type: 'html',
            value: wrapMdBlock(`<a name="${slug}" />`)
        });
    }

    for(const imageOrLink of unifyBoth(analysis)) {
        if(imageOrLink.node.title) {
            imageOrLink.node.title = null;
        }

        const url = imageOrLink.getUrl();
        const type = urlType(url);

        if (type === 'local') {
            const callback = imageOrLink.type === 'image' ? rewriteImage : rewriteLink;
            imageOrLink.setUrl(await callback(url, resolveUrl(url)));
        } else if (type === 'internal') {
            const node = imageOrLink.node;
            const markdown = renderTree(node);
            for (var member in myObject) delete node[member];
            node.type = 'html';
            node.value = wrapMdBlock(markdown);
        }
    }
}