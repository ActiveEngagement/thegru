import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';

export default async function(content, options = {}) {
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