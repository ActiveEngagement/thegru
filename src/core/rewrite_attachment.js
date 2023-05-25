import path from 'path';

export default async function(url, resolved, type, options) {
    const { logger, attachmentHandler, github, upload, isFileCommitted } = options;
    
    const committed = isFileCommitted(resolved);

    if (attachmentHandler === 'github_urls' && committed) {
        logger.info(`'Rewriting local ${type} ${url}`);
        return 'https://raw.githubusercontent.com/' + path.join(github.repo.name, github.commit.sha, resolved);
    }
    
    if (attachmentHandler === 'upload' || !committed) {
        logger.info(`Uploading and rewriting local ${type} ${url}`);
        return await upload(url, resolved, type);
    }
}