import { buildTree, renderTree } from '../content.js';
import transformContent from './transform_content.js';
import analyze from '../unist_analyze.js';
import { image, imageReference, definition, link, linkReference } from '../mdast_predicates.js';
import attachFooter from '../attach_footer.js';

export default async function(content, options) {
    const { logger, api, github, footer, attachmentHandler, filePath, isFileCommitted } = options;

    // Build the card content.
    // This is done here, in several steps, because we used to do some fancy things with it that required split steps.
    const contentTree = buildTree(attachFooter(content, { logger, github, footer }));
    const analysis = analyze(contentTree, image, imageReference, definition, link, linkReference);
    const { attachments } = await transformContent(filePath, analysis, {
        logger,
        api,
        github,
        attachmentHandler,
        isFileCommitted
    });
    content = renderTree(contentTree);
    
    return { attachments, content };
}