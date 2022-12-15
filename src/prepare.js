import fs from 'fs';
import { remark } from 'remark';
import { visit, EXIT as UNIST_EXIT, CONTINUE as UNIST_CONTINUE } from 'unist-util-visit';
import { is } from 'unist-util-is';
import { blobFromSync } from 'node-fetch';
import path from 'path';

function findReference(tree, reference) {
    let result = null;

    visit(tree, (node) => {
        if (is(node, { type: 'definition', identifier: reference })) {
            result = node;
            return UNIST_EXIT;
        }
        return UNIST_CONTINUE;
    });

    return result;
}

function getImages(tree) {
    const images = [];

    visit(tree, (node) => {
        if (is(node, { type: 'image' })) {
            images.push({
                url: node.url,
                setUrl(url) {
                    node.url = url;
                }
            });
        }

        if (is(node, { type: 'imageReference' })) {
            const reference = findReference(tree, node.identifier);
            images.push({
                url: reference.url,
                setUrl(url) {
                    reference.url = url;
                }
            });
        }

        return UNIST_CONTINUE;
    });

    return images;
}

export default async function (markdownInput, currentDir, api) {
    async function replaceImg(url) {
        if (url.startsWith('http')) {
            return url;
        }

        const previousDir = process.cwd();
        process.chdir(currentDir);

        const { link } = await api.uploadAttachment(path.basename(url), blobFromSync(url));

        process.chdir(previousDir);

        return link;
    }

    function plugin() {
        return async (tree) => {
            const images = getImages(tree);
            
            for (const image of images) {
                const newUrl = await replaceImg(image.url);
                image.setUrl(newUrl);
            }
        };
    }

    const output = await remark()
        .use(plugin)
        .process(markdownInput);

    return String(output);
}