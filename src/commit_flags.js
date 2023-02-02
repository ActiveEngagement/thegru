/**
 * Exposes a fluent API for analyzing a commit for commit flags.
 */
export default function() {
    const flags = [];

    function flag(name, flagCallback) {
        flags.push({ name, callback: flagCallback });

        return this;
    }

    function execute(message, options) {
        const { logger } = options;

        if(message) {
            flags.forEach((flag) => {
                if (message.includes(flag.name)) {
                    flag.callback();
                }
            });

            return true;
        } else {
            logger.warning('We were unable to read the latest commit message. Any commit flags will be ignored.');

            return false;
        }
    }

    return { flag, execute };
}