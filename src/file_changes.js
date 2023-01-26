import exec from '@actions/exec';
import { TheGuruError } from './error.js';

export default async function getChangedFiles(github) {
    const { exitCode, stdout, stderr } = await exec.getExecOutput(
        `git diff --name-only ${github.event.before} ${github.event.after}`,
        undefined,
        { ignoreReturnCode: true }
    );
    
    if (exitCode === 0) {
        return stdout.split('\n');
    }
    else {
        if (stderr.includes('bad object')) {
            return null;
        } else {
            throw new TheGuruError('The git command used to determine which files have changed reported an error!');
        }
    }
}