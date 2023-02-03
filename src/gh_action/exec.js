import exec from '@actions/exec';

/**
 * Wraps the GitHub Actions Exec toolkit to make it a bit nicer to work with and to emit log messages.
 */

export default async function(cmd, options) {
    const { logger } = options;

    logger.debug(`Executing \`${cmd}\``);

    const result = await exec.getExecOutput(
        cmd,
        undefined,
        {
            ignoreReturnCode: true,
            silent: true
        }
    );

    logger.debug(`${cmd} exited with code ${result.exitCode}`);
    logger.debug(`== stdout ==\n${stdout}`);
    logger.debug(`== stderr ==\n${stderr}`);

    return result;
}