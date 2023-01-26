import exec from '@actions/exec';
import { TheGuruError } from './error.js';

export default async function getChangedFiles(options) {
    const { github, logger } = options;

    const cmd = `git diff --name-only ${github.event.before} ${github.event.after}`;

    logger.debug(`Executing \`${cmd}\``);

    const { exitCode, stdout, stderr } = await exec.getExecOutput(
        cmd,
        undefined,
        {
            ignoreReturnCode: true,
            silent: true
        }
    );

    logger.debug(`stdout:\n${stdout}`);
    logger.debug(`stderr:\n${stderr}`);
    logger.debug(`exit code:\n${exitCode}`);
    
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