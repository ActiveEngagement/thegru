import path from 'path';
import { unifyBoth } from './mdast_unify.js';
import { isLocalUrl } from './util.js';
import { resolveLocalPath } from './util.js';
import { definition, image, imageReference, link, linkReference } from './mdast_predicates.js';
import { validate } from './unist_analyze.js';

export default async function(filePath, analysis, options) {
    validate(analysis, link, linkReference, image, imageReference, definition);

    const { rewriteImage, rewriteLink } = options;

    function resolveUrl(url) {
        return resolveLocalPath(url, path.dirname(filePath));
    }

    for(const imageOrLink of unifyBoth(analysis)) {
        if(imageOrLink.node.title) {
            imageOrLink.node.title = null;
        }

        const url = imageOrLink.getUrl();

        if(isLocalUrl(url)) {
            const callback = imageOrLink.type === 'image' ? rewriteImage : rewriteLink;
            imageOrLink.setUrl(await callback(url, resolveUrl(url)));
        }
    }
}