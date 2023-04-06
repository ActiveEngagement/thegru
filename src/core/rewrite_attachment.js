import path from 'path';

export default async function(url, resolved, type, options) {
    const { logger, attachmentHandler, github, upload } = options;

    switch (attachmentHandler) {
    case 'upload':
        logger.info(`'Uploading and rewriting local ${type} ${url}`);
        return await upload(url, resolved, type);
    case 'github_urls':
        logger.info(`'Rewriting local ${type} ${url}`);
        return 'https://raw.githubusercontent.com/' + path.join(github.repo.name, github.commit.sha, resolved);
    }
}