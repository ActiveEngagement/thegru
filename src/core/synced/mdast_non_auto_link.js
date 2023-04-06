//
// This is a horrifying solution to a problem that should be temporary.
//
// Guru, for whatever reason, does not like auto links. We therefore must prevent their creation. This function is a
// remark-stringify handler that has been copied straight from the link handler in the GitHub repository, with the
// autolink parts removed.
//
// I could think of no better way, unfortunately.
//


/**
 * @typedef {import('mdast').Link} Link
 * @typedef {import('../types.js').Parent} Parent
 * @typedef {import('../types.js').State} State
 * @typedef {import('../types.js').Info} Info
 * @typedef {import('../types.js').Exit} Exit
 */

import {checkQuote} from 'mdast-util-to-markdown/lib/util/check-quote.js';
import {formatLinkAsAutolink} from 'mdast-util-to-markdown/lib/util/format-link-as-autolink.js';

link.peek = linkPeek;

/**
 * @param {Link} node
 * @param {Parent | undefined} _
 * @param {State} state
 * @param {Info} info
 * @returns {string}
 */
export default function link(node, _, state, info) {
    const quote = checkQuote(state);
    const suffix = quote === '"' ? 'Quote' : 'Apostrophe';
    const tracker = state.createTracker(info);
    /** @type {Exit} */
    let exit;
    /** @type {Exit} */
    let subexit;

    exit = state.enter('link');
    subexit = state.enter('label');
    let value = tracker.move('[');
    value += tracker.move(
        state.containerPhrasing(node, {
            before: value,
            after: '](',
            ...tracker.current()
        })
    );
    value += tracker.move('](');
    subexit();

    if(
    // If there’s no url but there is a title…
        (!node.url && node.title) ||
    // If there are control characters or whitespace.
    /[\0- \u007F]/.test(node.url)
    ) {
        subexit = state.enter('destinationLiteral');
        value += tracker.move('<');
        value += tracker.move(
            state.safe(node.url, {before: value, after: '>', ...tracker.current()})
        );
        value += tracker.move('>');
    }
    else {
    // No whitespace, raw is prettier.
        subexit = state.enter('destinationRaw');
        value += tracker.move(
            state.safe(node.url, {
                before: value,
                after: node.title ? ' ' : ')',
                ...tracker.current()
            })
        );
    }

    subexit();

    if(node.title) {
        subexit = state.enter(`title${suffix}`);
        value += tracker.move(' ' + quote);
        value += tracker.move(
            state.safe(node.title, {
                before: value,
                after: quote,
                ...tracker.current()
            })
        );
        value += tracker.move(quote);
        subexit();
    }

    value += tracker.move(')');

    exit();
    return value;
}

/**
 * @param {Link} node
 * @param {Parent | undefined} _
 * @param {State} state
 * @returns {string}
 */
function linkPeek(node, _, state) {
    return formatLinkAsAutolink(node, state) ? '<' : '[';
}