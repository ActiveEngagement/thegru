import { buildTree, renderTree } from '../../src/core/content.js';
import transformContent from '../../src/core/synced/transform_content.js';
import createApi from '../../src/core/api.js';
import nullLogger from '../support/null_logger.js';
import arrayLogger from '../support/array_logger.js';
import createClient from '../support/api_client.js';
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
    options.cards ||= [];

    const tree = buildTree(content, options);
    const { tree: resultTree, attachments } = await transformContent(filePath, tree, options);
    const output = renderTree(resultTree);

    return { content: output, attachments };
}
describe('transform_content.js', () => {
    beforeEach(async() => {
        await env({
            some: {
                path: {
                    'image.png': 'content',
                    'file.pdf': 'content'
                }
            },
            path: {
                to: {
                    root: {
                        some: {
                            path: {
                                'image.png': 'content',
                                'file.pdf': 'content'
                            }
                        }
                    },
                    root2: {
                        'card.md': 'content'
                    },
                    some: {
                        path: {
                            'image.png': 'content',
                            'file.pdf': 'content'
                        }
                    }
                },
            }
        });
        process.chdir('test/env');
    });

    afterEach(() => {
        process.chdir('../..');
    })

    describe.each([
        [null],
        [false],
        [123]
    ])('with basic Markdown and no footer', (footer) => {
        it('does nothing', async() => {
            const logger = arrayLogger();
            const original = `# Hello, world!

Some things to think about:

1.  This
2.  That
3.  Those

Click [here](https://google.com).

Hi!
`;
            const { content: actual, attachments } = await build(null, original, { footer, logger });

            expect(actual).toBe(original);
            expect(attachments).toStrictEqual([]);
            expect(logger.getMessages().some(msg => msg === 'Skipping card footer...')).toBe(true);
        });
    });

    describe('with footer', () => {
        it('appends it', async() => {
            const original = `# Hello, world!

Hi!`;
            const expected = `# Hello, world!

Hi!

<https://example.com>
`;
            const { content: output } = await build(null, original);
            expect(output).toBe(expected);
        });
    });

    describe('with attachments', () => {
        test('with github_urls handler', async() => {
            const content = `# Hello, world!

Hi!

![remote image](https://jlockard.com/image.png)

![local root image](/some/path/image.png)

![local dotslash image](./some/path/image.png)

![local parent image](../some/path/image.png)

![local relative image](some/path/image.png)

[remote link](https://google.com)

[local root link](/some/path/file.pdf)`;
            const expected = `# Hello, world!

Hi!

![remote image](https://jlockard.com/image.png)

![local root image](https://raw.githubusercontent.com/ActiveEngagement/test/123/some/path/image.png)

![local dotslash image](https://raw.githubusercontent.com/ActiveEngagement/test/123/path/to/root/some/path/image.png)

![local parent image](https://raw.githubusercontent.com/ActiveEngagement/test/123/path/to/some/path/image.png)

![local relative image](https://raw.githubusercontent.com/ActiveEngagement/test/123/path/to/root/some/path/image.png)

[remote link](https://google.com)

[local root link](https://raw.githubusercontent.com/ActiveEngagement/test/123/some/path/file.pdf)
`;
            const { content: output, attachments } = await build('path/to/root/card.md', content, {
                footer: false,
                attachmentHandler: 'github_urls'
            });
            expect(output).toBe(expected);
            expect(attachments).toStrictEqual([]);
        });

        describe('with upload handler', () => {
            const content = `# Hello, world!

Hi!

![remote image](https://jlockard.com/image.png)

![local root image](/some/path/image.png)

![local dotslash image](./some/path/image.png)

![local parent image](../some/path/image.png)

![local relative image](some/path/image.png)

[remote link](https://google.com)

[local root link](/some/path/file.pdf)`;
            const expected = `# Hello, world!

Hi!

![remote image](https://jlockard.com/image.png)

![local root image](resources/some__path__image.png)

![local dotslash image](resources/path__to__root__some__path__image.png)

![local parent image](resources/path__to__some__path__image.png)

![local relative image](resources/path__to__root__some__path__image.png)

[remote link](https://google.com)

[local root link](resources/some__path__file.pdf)
`;
            let output = null;
            let attachments = null;

            beforeEach(async() => {
                ({ content: output, attachments } = await build('path/to/root/card.md', content, {
                    footer: false,
                    attachmentHandler: 'upload'
                }));
            });

            it('renders correctly', async() => {
                expect(output).toBe(expected);
            });

            it('correctly identifies the attachments', async() => {
                expect(attachments).toStrictEqual([
                    {
                        path: 'some/path/image.png',
                        id: 'some__path__image.png'
                    },
                    {
                        path: 'path/to/root/some/path/image.png',
                        id: 'path__to__root__some__path__image.png'
                    },
                    {
                        path: 'path/to/some/path/image.png',
                        id: 'path__to__some__path__image.png'
                    },
                    {
                        path: 'some/path/file.pdf',
                        id: 'some__path__file.pdf'
                    }
                ]);
            });
        });
    });

    test('with card links', async() => {
        const content = `# Hello, world!

Hi!

[remote link](https://google.com)

[local attachment](/some/path/file.pdf)

[card 1](../root2/card1.md)

[card 2](/path/to/root2/card2.md)

We can't link to ourselves!

[attachment link](/path/to/root2/card.md)
`;
        const expected = `# Hello, world!

Hi!

[remote link](https://google.com)

[local attachment](resources/some__path__file.pdf)

[card 1](cards/some__Long_special_card1name)

[card 2](cards/card2___name)

We can't link to ourselves!

[attachment link](resources/path__to__root2__card.md)
`;
        const { content: output } = await build('path/to/root/card.md', content, {
            footer: false,
            attachmentHandler: 'upload',
            cards: [
                {
                    name: 'some__Long_special_card1name',
                    file: 'path/to/root2/card1.md'
                },
                {
                    name: 'card2___name',
                    file: 'path/to/root2/card2.md'
                },
            ]
        });
        expect(output).toBe(expected);
    });

    test('internal links are ignored', async() => {
        const original = `# Hello, world!

<#some-heading>
`;
        const { content: actual } = await build(null, original, { footer: false });

        expect(actual).toBe(original);
    });
});