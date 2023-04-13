import path from 'path';
import fs from 'fs';
import { readFileSync, stripExtension } from '../../fs_util.js';
import { traverse } from './util.js';
import matter from 'gray-matter';
import yaml from 'js-yaml';
import { allowedCardInfo, allowedContainerInfo } from '../allowed_info.js';
import { DEBUG } from '../../verbosities.js';

/**
 * Traverses the given card/container tree and attempts to attach information (e.g. titles, external urls, descriptions,
 * etc.) from the following sources:
 *  - The default title is a "titleized" version of the file/directory name.
 *  - Cards may have a "frontmatter" section that contains info attributes.
 *  - Directories representing containers may have a ".info.yml" file containing info attributes.
 *  - Card Markdown files may have a corresponding YAML file with the same basename containing info attributes.
 * 
 * Note that as a side effect any info currently in the tree will be validated and fixed if necessary.
 */
export default function(tree, options) {
    const { logger } = options;

    traverse(tree).do((node, name, state) => {
        logger.debug(`[${state.path}]`);
        logger.indent(DEBUG);

        // The default title is a titleized form of the filename.
        node.info.title ||= inferTitle(name);

        if(node.type === 'card') {
            // We'll read from the frontmatter if it exists and save the content for later.
            const { data, content } = matter(readFileSync(node.file));

            Object.assign(node.info, data);

            if (data && data !== {}) {
                logger.debug('Using frontmatter');
            }

            node.content = content;

            // We'll read from the associated .yml or .yaml file if it exists.
            const name = stripExtension(node.file);
            const infoPath = [name + '.yaml', name + '.yml'].find(p => fs.existsSync(p));
            if(infoPath) {
                logger.debug(`Using ${infoPath}`);
                Object.assign(node.info, yaml.load(readFileSync(infoPath)));
            }

            // Let's make sure only valid info was added.
            for(const key of Object.keys(node.info)) {
                if(!allowedCardInfo.includes(key)) {
                    delete node.info[key];
                    logger.info(`Card "${state.path}" contains invalid info key "${key}". It will be ignored.`);
                }
            }
        }
        else if(node.type === 'container') {
            if(node.file) {
                // We'll read from the info file in the directory if it exists.
                const infoBase = path.join(node.file, '.info');
                const infoPath = [infoBase + '.yaml', infoBase + '.yml'].find(p => fs.existsSync(p));
                if(infoPath) {
                    logger.debug(`Using ${infoPath}`);
                    Object.assign(node.info, yaml.load(readFileSync(infoPath)));
                }
            }

            // Let's make sure only valid info was added.
            for(const key of Object.keys(node.info)) {
                if(!allowedContainerInfo.includes(key)) {
                    delete node.info[key];
                    logger.warning(`${state.path} contains invalid info key "${key}". It will be ignored.`);
                }
            }
        }

        logger.trace(`Evaluated info: ${JSON.stringify(node.info)}`);
        logger.unindent(DEBUG);
    });
}

/**
 * "Titleizes" a file name.
 * 
 * The filename is stripped of its extension and extreme whitespace is trimmed. All sequences of non-alphanumeric
 * characters are replaced by a single space. Each resulting word is capitalized.
 * 
 * Examples:
 * 
 * ```
 * inferTitle('test'); // => 'Test'
 * inferTitle('test-123'); // => 'Test 123'
 * inferTitle('test------123'); // => 'Test 123'
 * inferTitle('&*^__test------123   '); // => ' Test 123'
 * ```
 */
function inferTitle(fileName) {
    const stripped = stripExtension(fileName).trim();
    const spaced = stripped.replaceAll(/[^a-zA-Z\d]+/g, ' ');
    const titled = spaced.replaceAll(
        /\w\S*/g,
        function(txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1);
        }
    );

    return titled;
}