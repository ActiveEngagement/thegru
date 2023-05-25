import exec from './exec.js';

export default async function(options) {
    const { logger } = options;

    const { exitCode, stdout } = await exec('git diff-index HEAD --', { logger });

    if(exitCode !== 0) {
        logger.warning('The Git command used to obtain a list of changed files raised an unknown error. As a result, all attachments will be processed using the "upload" strategy, since we cannot determine which files are eligible for Github URLs.');
        return null;
    }

    return stdout
        .split(/\r?\n/)
        .map(line => line.split('\t')[1]);
}