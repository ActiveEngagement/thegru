import path from 'path';
import fs from 'fs';
import { readFileSync, stripExtension } from '../fs_util.js';
import { traverse } from './tree_util.js';
import matter from 'gray-matter';
import yaml from 'js-yaml';

const allowedCardInfo = ['title', 'externalUrl'];
const allowedContainerInfo = ['title', 'description', 'externalUrl'];

/**
 * Traverses the given tree, processes any card content, attempts to attach relevant info to each node. Info is derived
 * from file paths, card content, container info files, and card info files.
 */
export default function(tree, options) {
    const { logger } = options;

    traverse(tree).do((node, name) => {
        // The default title is the name.
        node.info.title ||= stripExtension(name);

        if(node.type === 'card') {
            // We'll read from the frontmatter if it exists and save the content for later.
            const { data, content } = matter(readFileSync(node.file));

            Object.assign(node.info, data);
            node.content = content;

            // We'll read from the associated .yml or .yaml file if it exists.
            const name = stripExtension(node.file);
            const infoPath = [name + '.yaml', name + '.yml'].find(p => fs.existsSync(p));
            if(infoPath) {
                Object.assign(node.info, yaml.load(readFileSync(infoPath)));
            }

            for (const key of Object.keys(node.info)) {
                if (!allowedCardInfo.includes(key)) {
                    delete node.info[key];
                    logger.warning(`Card "${node.path}" contains invalid info key "${key}. It will be ignored.`);
                }
            }
        }
        else if(node.type === 'container') {
            if(node.file) {
                // We'll read from the info file in the directory if it exists.
                const infoBase = path.join(node.file, '.info');
                const infoPath = [infoBase + '.yaml', infoBase + '.yml'].find(p => fs.existsSync(p));
                if(infoPath) {
                    Object.assign(node.info, yaml.load(readFileSync(infoPath)));
                }
            }

            for (const key of Object.keys(node.info)) {
                if (!allowedContainerInfo.includes(key)) {
                    delete node.info[key];
                    logger.warning(`Container "${node.path}" contains invalid info key "${key}. It will be ignored.`);
                }
            }
        }
    });
}