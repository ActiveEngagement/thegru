import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';

export function buildTree(content, options = {}) {
    const { logger, github, footer: footerTemplate } = options;

    if(footerTemplate && typeof footerTemplate === 'string') {
        const footer = footerTemplate.replaceAll('{{repository_url}}', github.repo.url);
        content += '\n\n' + footer;
    }
    else {
        logger.info('Skipping card footer...');
    }

    return unified()
        .use(remarkParse)
        .parse(content);
}

export async function transformTree(tree, transform) {
    return await unified()
        .use(() => transform)
        .run(tree);
}

export function renderTree(tree) {
    const output = unified()
        .use(remarkStringify)
        .stringify(tree);

    return String(output);
}