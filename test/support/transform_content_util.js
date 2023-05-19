import { analysisBuilder as analysisBuilderBase } from '../../src/core/unist_analyze.js';
import * as predicates from '../../src/core/mdast_predicates.js';
import { image as buildImage, link as buildLink, text } from 'mdast-builder';

export function analysisBuilder() {
    return analysisBuilderBase()
        .add(predicates.image)
        .add(predicates.link)
        .add(predicates.imageReference)
        .add(predicates.linkReference)
        .add(predicates.definition);
}

export function imageLinkAnalysis(images, links) {
    return analysisBuilder()
        .add(predicates.image, images)
        .add(predicates.link, links)
        .build();
}

export function link(url, desc) {
    return buildLink(url, null, text(desc));
}

export function image(url, desc) {
    return buildImage(url, null, desc);
}