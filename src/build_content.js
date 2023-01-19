import path from 'path';
import process from 'process';
import { blobFromSync } from 'node-fetch';
import { wrapGuruMarkdown } from './api_util.js';
import { readFile } from './fs_util.js';
import prepare from './prepare.js';

export default async function(filePath, options = {}) {
    let { footer, defaultFooter, imageHandler, api, logger, github: { repositoryUrl, repositoryName } } = options;

    logger.info(`Reading ${filePath}`);

    let content = await readFile(filePath);

    if(footer === undefined || footer === null || footer === true) {
        logger.info('Using default card footer...');
        footer = defaultFooter;
    }

    if(footer && typeof footer === 'string') {
        footer = footer.replaceAll('{{repository_url}}', repositoryUrl);
        content += '\n\n' + footer;
    }
    else {
        logger.info('Skipping card footer...');
    }

    async function uploadImage(url) {
        logger.info(`Uploading and rewriting local image ${url}`);

        const parentDir = path.dirname(filePath);
        const previousDir = process.cwd();

        process.chdir(parentDir);
        const { link } = await api.uploadAttachment(path.basename(url), blobFromSync(url));
        process.chdir(previousDir);

        return link;
    }

    function getGithubImageUrl(url) {
        return path.join('https://raw.githubusercontent.com', repositoryName, url);
    }

    async function getImageUrl(url) {
        switch (imageHandler) {
        case 'upload':
            return await uploadImage(url);
        case 'github_urls':
            return getGithubImageUrl(url);
        }
    }

    content = wrapGuruMarkdown(await prepare(content, { getImageUrl }));

    return content;
}