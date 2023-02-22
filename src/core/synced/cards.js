import path from 'path';
import globBase from 'glob';

function glob(pattern, options = {}) {
    if (options.strict === undefined) {
        options.strict = true;
    }

    if (options.nomount === undefined) {
        options.nomount = true;
    }

    return globBase.sync(pattern, options);
}

export default function(rules, options) {
    const { logger } = options;

    function cardFor(rule, parent, file) {
        let board = rule.board;

        if (!board) {
            const dir = path.dirname(file);

            if (dir === '.') {
                board = null;
            }
            else {
                board = path.join(rule.rootBoard || '', path.dirname(file));
            }
        }

        return { path: parent + file, board, title: rule.title || null };
    }

    function cardsUnder(rule, parent) {
        const files = glob(rule.glob, {
            cwd: parent,
            nodir: true
        });

        return files.map(file => cardFor(rule, parent, file));
    }

    function parseRule(rule) {
        if (typeof rule === 'string') {
            return parseRule({ glob: rule });
        }

        if (rule.rootDir) {
            if (!rule.rootDir.endsWith('/')) {
                logger.warning(`Card rule rootDir "${rule.rootDir}" does not end with a "/". This was probably an accident, so we will append one.`);
                rule.rootDir += '/';
            }

            return glob(rule.rootDir).flatMap(parent => cardsUnder(rule, parent));
        } else {
            return cardsUnder(rule, '');
        }
    }

    return rules.flatMap(r => parseRule(r));
}