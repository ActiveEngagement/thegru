import path from 'path';
import fs from 'fs';
import { readFileSync, stripExtension } from '../fs_util';
import matter from 'gray-matter';
import { attach, card, ensureContainerPath, root, traversePath } from './tree_util';
import { glob } from '../util';
import yaml from 'js-yaml';

export default function(rules, options) {
    const { logger } = options;

    const tree = root();

    function processFile(filePath, rule) {
        const { data, content } = matter(readFileSync(filePath));

        const info = {};

        const name = stripExtension(filePath);
        const infoPath = [name + '.yaml', name + '.yml'].find(p => fs.existsSync(p));

        if(infoPath) {
            Object.assign(info, yaml.load(readFileSync(infoPath)));
        }

        if(data) {
            Object.assign(info, data);
        }

        if(rule.title) {
            info.title = rule.title;
        }

        if(rule.externalUrl) {
            info.externalUrl = rule.externalUrl;
        }

        return { info, content };
    }

    function getContainerForFile(rule, file, parentDir) {
        if(rule.container) {
            return ensureContainerPath(tree, rule.container);
        }
        else {
            let containerPath = path.dirname(file);

            if(containerPath === '.') {
                containerPath = null;
            }

            const rootContainer = rule.rootContainer ? ensureContainerPath(tree, rule.rootContainer) : tree;

            if (containerPath) {
                return ensureContainerPath(rootContainer, containerPath, true, parentDir);
            } else {
                return rootContainer;
            }

        }
    }

    function applyRuleForParentDir(rule, parentDir) {
        const files = glob(rule.glob, {
            cwd: parentDir,
            nodir: true
        });

        for(const file of files) {
            const fullPath = path.join(parentDir, file);
            const container = getContainerForFile(rule, file, parentDir) || tree;
            const { info, content } = processFile(fullPath, rule);

            attach(container, path.basename(file), card({ ...info, content, file: fullPath }));
        }
    }

    function applyRule(rule) {
        if(typeof rule === 'string') {
            applyRule({ glob: rule });

            return;
        }

        if(rule.rootDir) {
            if(!rule.rootDir.endsWith('/')) {
                logger.warning(`Card rule rootDir "${rule.rootDir}" does not end with a "/". This was probably an accident, so we will append one.`);
                rule.rootDir += '/';
            }

            glob(rule.rootDir).forEach(p => applyRuleForParentDir(rule, p));
        }
        else {
            applyRuleForParentDir(rule, '');
        }
    }

    rules.forEach(applyRule);

    return tree;
}