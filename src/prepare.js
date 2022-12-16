import { remark } from 'remark';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import rehypeSlug from 'rehype-slug';
import { visit, CONTINUE as UNIST_CONTINUE } from 'unist-util-visit';
import { blobFromSync } from 'node-fetch';
import path from 'path';

function analyze(tree, types) {
    const analysis = {};

    for (const name of Object.keys(types)) {
        analysis[name] = [];
    }

    visit(tree, (node, _index, parent) => {
        for (const [name, test] of Object.entries(types)) {
            if (test.test(node.tagName)) {
                node.parent = parent;
                analysis[name].push(node);
            }
        }

        return UNIST_CONTINUE;
    });

    return analysis;
}

function wrapMarkdown(markdownInput) {
    return `<div class="ghq-card-content__markdown" data-ghq-card-content-type="MARKDOWN" data-ghq-card-content-markdown-content="${escape(markdownInput)}"></div>`;
}

export default async function (markdownInput, options = {}) {
    const currentDir = options.currentDir;
    const api = options.api;

    async function transformImg(node) {
        const url = node.properties.src;

        if (!url.startsWith('http')) {
            const previousDir = process.cwd();
            process.chdir(currentDir);

            const { link } = await api.uploadAttachment(path.basename(url), blobFromSync(url));

            process.chdir(previousDir);

            node.properties.src = link;
        }

        node.properties.style = "width: auto;";
    }

    function plugin() {
        return async (tree) => {
            const analysis = analyze(tree, {
                heading: /h[1-6]/,
                image: /img/,
                link: /a/
            });

            for (const node of analysis.image) {
                await transformImg(node);
            }
        };
    }

    const output = await remark()
        .use(remarkParse)
        .use(remarkRehype)
        .use(plugin)
        .use(rehypeSlug)
        .use(rehypeStringify)
        .process(markdownInput);
    
    return options.wrapMarkdown ? wrapMarkdown(String(output)) : String(output);
}