import { remark } from 'remark';
import { unified } from 'unified';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import { visit, CONTINUE as UNIST_CONTINUE } from 'unist-util-visit';
import { toString } from 'mdast-util-to-string';
import { is } from 'unist-util-is';
import { blobFromSync } from 'node-fetch';
import path from 'path';
import TheGuruError from './error.js';

function analyze(tree, ...types) {
    const analysis = {};

    for (const type of types) {
        analysis[type] = [];
    }

    visit(tree, (node, _index, parent) => {
        for (const type of types) {
            if (is(node, { type })) {
                node.parent = parent;
                analysis[type].push(node);
            }
        }

        return UNIST_CONTINUE;
    });

    return analysis;
}

function findReference(referenceNodes, identifier) {
    return referenceNodes.find(node => node.identifier === identifier);
}

function buildImages(imageNodes, imageReferenceNodes, referenceNodes) {
    const images = [];

    for (const node of imageNodes) {
        images.push({
            node,
            get url() { return node.url; },
            set url(value) { node.url = value; },
            replaceWithHtml(html) {
                node.parent.children[node.parent.children.indexOf(node)] = {
                    type: 'html',
                    value: html
                };
            }
        });
    }

    for (const node of imageReferenceNodes) {
        const reference = findReference(referenceNodes, node.identifier);

        images.push({
            node,
            get url() { return reference.url; },
            set url(value) { reference.url = value; },
            replaceWithHtml(html) {
                node.parent.children[node.parent.children.indexOf(node)] = {
                    type: 'html',
                    value: html
                };
                reference.parent.children.splice(reference.parent.children.indexOf(reference), 1);
            }
        });
    }

    return images;
}

function buildLinks(linkNodes, linkReferenceNodes, referenceNodes) {
    const links = [];

    for (const node of linkNodes) {
        links.push({
            get url() { return node.url; },

            get text() { return toString(node); },

            replaceWithHtml(html) {
                node.parent.children[node.parent.children.indexOf(node)] = {
                    type: 'html',
                    value: html
                };
            }
        });
    }

    for (const node of linkReferenceNodes) {
        const reference = findReference(referenceNodes, node.identifier);

        links.push({
            get url() { return reference.url; },

            get text() { return toString(node); },

            replaceWithHtml(html) {
                node.parent.children[node.parent.children.indexOf(node)] = {
                    type: 'html',
                    value: html
                };
                reference.parent.children.splice(reference.parent.children.indexOf(reference), 1);
            }
        });
    }

    return links;
}

function wrapMarkdown(markdownInput) {
    return `<div class="ghq-card-content__markdown" data-ghq-card-content-type="MARKDOWN" data-ghq-card-content-markdown-content="${escape(markdownInput)}"></div>`;
}

export default async function (markdownInput, options = {}) {
    const currentDir = options.currentDir;
    const api = options.api;

    async function replaceImg(image) {
        const url = image.url;

        if (!url.startsWith('http')) {
            const previousDir = process.cwd();
            process.chdir(currentDir);

            const { link } = await api.uploadAttachment(path.basename(url), blobFromSync(url));

            process.chdir(previousDir);

            image.url = link;
        }

        const hastTree = await unified()
            .use(remarkRehype)
            .run(image.node);

        visit(hastTree, { tagName: 'img' }, node => {
            node.properties.style = 'width: auto;';
        });

        const output = unified()
            .use(rehypeStringify)
            .stringify(hastTree);
        
        image.replaceWithHtml(String(output));
    }

    async function replaceLink(link, headingNodes) {
        const url = link.url;

        if (!url.startsWith('#')) {
            return url;
        }

        const linkedHeading = url.substring(1);

        const headingNode = headingNodes.find(node => {
            return toString(node).toLowerCase().replaceAll(/[^a-zA-Z0-9]+/g, '-') === linkedHeading
        });

        if (!headingNode) {
            throw new TheGuruError(`Link to nonexistent heading ${url}!`);
        }

        headingNode.parent.children.splice(headingNode.parent.children.indexOf(headingNode), 0, {
            type: 'html',
            value: `<a name="${linkedHeading}"></a>`
        });

        link.replaceWithHtml(`<a href="${link.url}">${link.text}</a>`);
    }

    function plugin() {
        return async (tree) => {
            const analysis = analyze(tree, 'definition', 'heading', 'image', 'imageReference', 'link', 'linkReference');
            const images = buildImages(analysis.image, analysis.imageReference, analysis.definition);
            const links = buildLinks(analysis.link, analysis.linkReference, analysis.definition);

            for (const image of images) {
                await replaceImg(image);
            }

            for (const link of links) {
                replaceLink(link, analysis.heading);
            }

        };
    }

    const output = await remark()
        .use(plugin)
        .process(markdownInput);
    
    return options.wrapMarkdown ? wrapMarkdown(String(output)) : String(output);
}