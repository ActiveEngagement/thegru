/**
 * Attaches a footer to card content.
 */
export default function(content, options) {
    const { logger, github, footer: footerTemplate } = options;

    if(footerTemplate && typeof footerTemplate === 'string') {
        const footer = footerTemplate.replaceAll('{{repository_url}}', github.repo.url);
        content += '\n\n' + footer;
    }
    else {
        logger.info('Skipping card footer...');
    }

    return content;
}