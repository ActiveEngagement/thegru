import { buildTree, renderTree } from '../../src/core/content.js';
import transformContent from '../../src/core/standard/transform_content.js';
import createApi from '../../src/core/api.js';
import nullLogger from '../support/null_logger.js';
import arrayLogger from '../support/array_logger.js';
import createClient from '../support/api_client.js';
import { image, imageReference, definition, link, linkReference } from '../../src/core/mdast_predicates.js';
import analyze from '../../src/core/unist_analyze.js';
import attachFooter from '../../src/core/attach_footer.js';
import env from '../support/env.js';

async function build(filePath, content, options = {}) {
    options.logger ||= nullLogger();
    if(options.client) {
        options.api ||= createApi(options.client, { logger: options.logger });
        delete options.client;
    }
    options.github ||= {};
    options.github ||= {};
    options.github.repo ||= {};
    options.github.repo.url ||= 'https://example.com';
    options.github.repo.name ||= 'ActiveEngagement/test';
    options.github.commit ||= {};
    options.github.commit.sha ||= '123';
    if(options.footer === undefined) {
        options.footer = '<{{repository_url}}>';
    }

    const tree = await buildTree(attachFooter(content, options), options);
    const analysis = analyze(tree, image, imageReference, link, linkReference, definition);
    await transformContent(filePath, analysis, options);
    return (await renderTree(tree));
}

describe('build_content.js', () => {
    beforeEach(async() => {
        await env({
            some: {
                path: {
                    'image.png': 'content',
                    'image1.png': 'content',
                    'image2.png': 'content'
                },
            },
            path: {
                to: {
                    root: {
                        some: {
                            path: {
                                'image.png': 'content',
                                'image1.png': 'content',
                                'image2.png': 'content'
                            }
                        }
                    },
                    some: {
                        path: {
                            'image.png': 'content'
                        }
                    }
                },
            }
        });
        process.chdir('test/env');
    });

    afterEach(() => {
        process.chdir('../..');
    });

    test('basic Markdown template', async() => {
        const content = `# Hello, world!

Hi!`;
        const expected = `# Hello, world!

Hi!

<https://example.com>
`;

        const output = await build(null, content);
        expect(output).toBe(expected);
    });

    it('generates navigable hedings', async() => {
        const content = `# Hello, world!

Hi!

## Sub Heading

Hi again!

### &$Some,Crazy Crazy HEADING---`;

        const expected = `# Hello, world!

Hi!

## Sub Heading

Hi again!

### &$Some,Crazy Crazy HEADING---
`;

        const output = await build(null, content, {
            footer: false
        });
        expect(output).toBe(expected);
    });

    describe.each([
        [null],
        [false],
        [123]
    ])('with no footer', (footer) => {
        const content = `# Hello, world!

Hi!`;
        const expected = `# Hello, world!

Hi!
`;
        let logger = null;
        let output = null;

        beforeEach(async() => {
            logger = arrayLogger();
            output = await build(null, content, { logger, footer });
        });

        it('renders correctly', () => {
            expect(output).toBe(expected);
        });
    });

    describe('with images and links', () => {
        test('with github_urls handler', async() => {
            const content = `# Hello, world!

Hi!

![remote image](https://jlockard.com/image.png)

![local root image](/some/path/image.png)

![local dotslash image](./some/path/image.png)

![local parent image](../some/path/image.png)

![local relative image](some/path/image.png)

[remote link](https://jlockard.com/image.png)

[local root link](/some/path/image.png)

[local dotslash link](./some/path/image.png)

[local parent link](../some/path/image.png)

[local relative link](some/path/image.png)`;
            const expected = `# Hello, world!

Hi!

![remote image](https://jlockard.com/image.png)

![local root image](https://raw.githubusercontent.com/ActiveEngagement/test/123/some/path/image.png)

![local dotslash image](https://raw.githubusercontent.com/ActiveEngagement/test/123/path/to/root/some/path/image.png)

![local parent image](https://raw.githubusercontent.com/ActiveEngagement/test/123/path/to/some/path/image.png)

![local relative image](https://raw.githubusercontent.com/ActiveEngagement/test/123/path/to/root/some/path/image.png)

[remote link](https://jlockard.com/image.png)

[local root link](https://raw.githubusercontent.com/ActiveEngagement/test/123/some/path/image.png)

[local dotslash link](https://raw.githubusercontent.com/ActiveEngagement/test/123/path/to/root/some/path/image.png)

[local parent link](https://raw.githubusercontent.com/ActiveEngagement/test/123/path/to/some/path/image.png)

[local relative link](https://raw.githubusercontent.com/ActiveEngagement/test/123/path/to/root/some/path/image.png)
`;
            const output = await build('path/to/root/card.md', content, {
                footer: false,
                attachmentHandler: 'github_urls'
            });
            expect(output).toBe(expected);
        });

        describe('with upload handler', () => {
            const content = `# Hello, world!

Hi!

![remote image](https://jlockard.com/image.png)

![local root image](/some/path/image1.png)

![local dotslash image](./some/path/image.png)

![local parent image](../some/path/image.png)

![local relative image](some/path/image2.png)

[remote link](https://jlockard.com/image.png)

[local root link](/some/path/image1.png)

[local dotslash link](./some/path/image.png)

[local parent link](../some/path/image.png)

[local relative link](some/path/image2.png)`;
            const expected = `# Hello, world!

Hi!

![remote image](https://jlockard.com/image.png)

![local root image](some-image-link)

![local dotslash image](some-image-link)

![local parent image](some-image-link)

![local relative image](some-image-link)

[remote link](https://jlockard.com/image.png)

[local root link](some-image-link)

[local dotslash link](some-image-link)

[local parent link](some-image-link)

[local relative link](some-image-link)
`;
            let client = null;
            let output = null;

            beforeEach(async() => {
                client = createClient({ uploadAttachmentResult: { link: 'some-image-link' } });
                output = await build('path/to/root/card.md', content, {
                    client,
                    footer: false,
                    attachmentHandler: 'upload'
                });
            });

            it('renders correctly', async() => {
                expect(output).toBe(expected);
            });

            it('correctly uploads the root attachment', async() => {
                expect(client.getCalls()[0]).toMatchObject({
                    type: 'uploadAttachment',
                    fileName: 'image1.png',
                    filePath: 'some/path/image1.png'
                });
            });

            it('correctly uploads the dotslash attachment', async() => {
                expect(client.getCalls()[1]).toMatchObject({
                    type: 'uploadAttachment',
                    fileName: 'image.png',
                    filePath: 'path/to/root/some/path/image.png'
                });
            });

            it('correctly uploads the parent attachment', async() => {
                expect(client.getCalls()[2]).toMatchObject({
                    type: 'uploadAttachment',
                    fileName: 'image.png',
                    filePath: 'path/to/some/path/image.png'
                });
            });

            it('correctly uploads the relative attachment', async() => {
                expect(client.getCalls()[3]).toMatchObject({
                    type: 'uploadAttachment',
                    fileName: 'image2.png',
                    filePath: 'path/to/root/some/path/image2.png'
                });
            });
        });
    });
});