import path from 'path';
import process from 'process';
import { blobFromSync } from 'node-fetch';
import { wrapGuruMarkdown } from './api_util.js';
import { readFile } from './fs_util.js';
import prepare from './prepare.js';

export default async function(filePath, options = {}) {
    let { footer, defaultFooter, repositoryUrl, api } = options;

    let content = await readFile(filePath);

    if(footer === undefined || footer === null || footer === true) {
        footer = defaultFooter;
    }

    if(footer && typeof footer === 'string') {
        footer = footer.replaceAll('{{repository_url}}', repositoryUrl);
        content += '\n\n' + footer;
    }

    async function uploadImage(url) {
        const parentDir = path.dirname(filePath);
        const previousDir = process.cwd();

        process.chdir(parentDir);
        const { link } = await api.uploadAttachment(path.basename(url), blobFromSync(url));
        process.chdir(previousDir);

        return link;
    }

    content = wrapGuruMarkdown(await prepare(content, { getImageUrl: uploadImage }));

    return content;
}