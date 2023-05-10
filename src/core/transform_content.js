import path from 'path';
import { unifyBoth } from './mdast_unify.js';
import { isLocalUrl, urlType } from './util.js';
import { resolveLocalPath } from './util.js';
import { definition, image, imageReference, link, linkReference, heading } from './mdast_predicates.js';
import { validate } from './unist_analyze.js';
import rewriteAttachment from './rewrite_attachment.js';
import Slugger from 'github-slugger';
import { toString } from 'mdast-util-to-string';

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
        headingNode.children.push({
            type: 'html',
            value: `<a name="${slugger.slug(toString(heading))}" />`
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
        }
    }
}