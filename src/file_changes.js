import exec from '@actions/exec';
import { TheGuruError } from './error';

export default async function getChangedFiles(github) {
    const { exitCode, stdout, stderr } = await exec.getExecOutput(`git diff --name-only ${github.event.before} ${github.event.after}`);
    
    if (exitCode === 0) {
        return stdout.split('\n');
    }
    else {
        if (stderr.includes('bad object')) {
            throw new TheGuruError('The git command used to determine which files have changed reported a bad commit. Most likely, you did not set `fetch-depth: 0` in your checkout action.')
        } else {
            throw new TheGuruError('The git command used to determine which files have changed reported an error!');
        }
    }
}