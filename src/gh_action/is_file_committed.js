import exec from './exec.js';


export default async function isFileCommitted(file, options) {
    const { logger } = options;

    const { exitCode } = await exec(`git ls-files --error-unmatch ${file}`, { logger });
    
    if(exitCode === 1) {
        return false;
    }
    else if(exitCode > 0) {
        logger.warning(`An unknown error occurred while attempting to determine whether ${file} is committed to the repository. Just to be safe, we'll use the "upload" strategy for this file.`);
        return false;
    }

    return true;
}
