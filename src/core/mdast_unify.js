import { definition, image, imageReference, link, linkReference } from './mdast_predicates.js';
import { validate } from './unist_analyze.js';

export function unifyImages(analysis) {
    validate(analysis, image, imageReference, definition);

    return unify(analysis.get(image), analysis.get(imageReference), analysis.get(definition), 'image');
}

export function unifyLinks(analysis) {
    validate(analysis, link, linkReference, definition);

    return unify(analysis.get(link), analysis.get(linkReference), analysis.get(definition), 'link');
}

export function unifyBoth(analysis) {
    return unifyImages(analysis).concat(unifyLinks(analysis));
}

export function unify(explicit, references, definitions, type) {
    const result = [];

    for(const node of explicit) {
        result.push({
            type,

            node,

            getUrl() {
                return node.url;
            },

            setUrl(url) {
                node.url = url;
            }
        });
    }

    for(const node of references) {
        const definition = definitions.find(n => n.identifier === node.identifier);
        result.push({
            type,

            node,
            
            definition,

            getUrl() {
                return definition.url;
            },

            setUrl(url) {
                definition.url = url;
            }
        });
    }

    return result;
}