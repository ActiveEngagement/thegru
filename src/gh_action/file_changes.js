import exec from './exec.js';
import { InvalidGitObjectError, TheGuruError } from './error.js.js';

/**
 * Runs a `git diff` to determine which files have changed in this push.
 */

export default async function getChangedFiles(options) {
    const { github, logger } = options;

    const { exitCode, stdout, stderr } = exec(`git diff --name-only ${github.event.before} ${github.event.after}`, { logger });
    
    if(exitCode === 0) {
        return stdout.split('\n');
    }
    else {
        if(stderr.includes('bad object')) {
            throw new InvalidGitObjectError('The Git command used to determine which files have changed reported an invalid object.');
        }
        else {
            throw new TheGuruError('The Git command used to determine which files have changed reported an unknown error!');
        }
    }
}