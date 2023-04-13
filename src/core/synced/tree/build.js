import path from 'path';
import { root, card, attach, traversePath, ensureContainerPath } from './util.js';
import { glob } from '../../util.js';
import { allowedCardInfo } from '../allowed_info.js';
import { DEBUG, INFO, level } from '../../verbosities.js';

/**
 * Builds a basic tree of cards and containers from the given set of card rules. This tree contains only file paths
 * and types, plus any info contained in the rules themselves.
 */
export default function(rules, options) {
    const { logger, colors } = options;

    const tree = root();
    logger.info(`Processing ${rules.length} rule${rules.length === 1 ? '' : 's'}...`);
    rules.forEach(applyRule);

    return tree;

    /**
     * Gets the path to the appropriate container for the given card file path, rule by which the card was indicated,
     * and parent directory.
     * 
     * If the path does not currently exist in the tree, it will be created.
     */
    function getContainerForCard(rule, file, parentDir) {
        if(rule.container) {
            // If the container was specified explicitly in the rule, then it takes precedence.
            // Traverse the specified path, creating any missing containers.
            //
            // Do note that no file paths are included when missing containers are created, because there is no
            // guarantee of a corresponding directory.
            logger.trace(`The container "${rule.container}" was specified explicitly in the rule.`);
            return {
                container: ensureContainerPath(tree, rule.container),
                path: rule.container
            };
        }

        let fullContainerPath = '';
        let rootContainer;

        const rootContainerPath = rule.rootContainer;
        if(rootContainerPath) {
            // If the user has specified a "root container" path in the rule, then we need to evaluate it and then
            // evaluate the actual container path beneath it.
            //
            // Note that no file paths are included in any created containers, since there are likely no corresponding
            // directories.
            logger.trace(`A rootContainer "${rootContainerPath}" was specified in the rule. We'll prepend it to the container path.`);
            fullContainerPath = path.join(fullContainerPath, rootContainerPath);
            rootContainer = ensureContainerPath(tree, rootContainerPath);
        }
        else {
            // If no root container path was specified, then the container path will be evaluated beneath the tree itself.
            rootContainer = tree;
        }

        let container;

        let containerPath = path.dirname(file);
        if(containerPath !== '.') {
            // If the file is in one or more sub-directories, then we need to traverse the path (beneath the root
            // container), creating any containers not yet in the tree and attaching the correct file path.
            //
            // NOTE that the file path is intentionally attached for ANY missing container along the path, whether
            // newly created or not.
            // This way, if the container was originally created by some other method (say, an explicit container clause
            // in a rule, but also referenced by a rule containing a card beneath a subdirectory, then the file will
            // still get attached as it should and info files will still be read).
            logger.trace(`The card resides in the relative directory "${containerPath}". We'll append that to the path.`);
            fullContainerPath = path.join(fullContainerPath, containerPath);
            container = traversePath(rootContainer, containerPath, (node, ctx) => {
                if(!node.file) {
                    node.file = path.join(parentDir, ctx.path);
                }
            }, { makeMissing: true });
        }
        else {
            // If the file is top-level (i.e. with no parent directory), then no further containers are needed and we'll
            // return the root container.
            container = rootContainer;
        }

        return { container, path: fullContainerPath };
    }

    /**
     * Adds appropriate container and card nodes to the tree for the given card rule, under the given parent directory
     * (which may be blank).
     */
    function applyRuleForParentDir(rule, ruleInfo, parentDir) {
        const files = glob(rule.glob, {
            cwd: parentDir,
            nodir: true
        });

        logger.info(`Found these files under ${parentDir}`);
        logger.indent();

        for(const file of files) {
            if (level(logger.verbosity()) > DEBUG) {
                logger.info(file);
                logger.indent();
            }

            const fullPath = path.join(parentDir, file);
            const { container, path: containerPath } = getContainerForCard(rule, file, parentDir);
            const name = path.basename(file);

            const containerString = containerPath === '' ? 'the top level' : `"${containerPath}"`;

            if (level(logger.verbosity()) <= DEBUG) {
                logger.info(file + colors.gray(` (assigned to ${containerString})`));
            } else {
                logger.trace(`Assigned to ${containerString}.`);
                logger.unindent();
            }

            const payload = { file: fullPath };

            // Attach any valid info.
            Object.assign(payload, ruleInfo);

            attach(container, name, card(payload));
        }

        logger.unindent(INFO);
    }

    /**
     * Adds appropriate nodes to the tree for the given card rule.
     */
    function applyRule(rule) {
        logger.debug(colors.bold(`Found rule ${JSON.stringify(rule)}`));

        // A lone string is interpreted as a basic glob.
        if(typeof rule === 'string') {
            rule = { glob: rule };
        }

        const ruleInfo = {};

        for(const [key, value] of Object.entries(rule)) {
            if(allowedCardInfo.includes(key)) {
                logger.debug(`Using "${key}" from rule.`);
                ruleInfo[key] = value;
            }
        }

        if(rule.rootDir) {
            // If there's a root dir glob, then apply the rule for each indicated root dir.

            logger.debug('Since the rule has a rootDir glob, it will be interpreted once under each directory matching the glob.');

            if(!rule.rootDir.endsWith('/')) {
                logger.warning(`Card rule rootDir "${rule.rootDir}" does not end with a "/". This was probably an accident, so we will append one.`);
                rule.rootDir += '/';
            }

            glob(rule.rootDir).forEach(p => applyRuleForParentDir(rule, ruleInfo, p));
        }
        else {
            // Otherwise, apply the rule without any parent dir.
            applyRuleForParentDir(rule, ruleInfo, '');
        }
    }
}
