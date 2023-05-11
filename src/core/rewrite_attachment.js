import path from 'path';
import fs from 'fs';

export default async function(url, resolved, type, options) {
    const { logger, attachmentHandler, github, upload, cardFilePath: filePath } = options;

    if(!fs.existsSync(resolved)) {
        logger.warning(`${filePath} referenced "${url}", which does not exist on the file system. We'll ignore it, but you likely have a broken link.`);
        return url;
    }

    const stat = await fs.promises.stat(resolved);

    if(stat.isDirectory()) {
        logger.warning(`${filePath} referenced "${url}", which is a directory. We'll ignore it, but you likely have a broken link.`);
        return url;
    }
    
    switch (attachmentHandler) {
    case 'upload':
        logger.info(`Uploading and rewriting local ${type} ${url}`);
        return await upload(url, resolved, type);
    case 'github_urls':
        logger.info(`'Rewriting local ${type} ${url}`);
        return 'https://raw.githubusercontent.com/' + path.join(github.repo.name, github.commit.sha, resolved);
    }
}