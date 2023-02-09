import buildContentTree from '../src/core/build_content_tree.js';
import buildContent from '../src/core/build_content.js';
import createApi from '../src/core/api.js';
import nullLogger from './support/null_logger.js';
import arrayLogger from './support/array_logger.js';
import createClient from './support/api_client.js';

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

    const tree = await buildContentTree(content, options);
    return await buildContent(filePath, tree, options);
}

describe('build_content.js', () => {
    test('basic Markdown template', async() => {
        const content = `# Hello, world!

Hi!`;
        const expected = `<h1 id="hello-world">Hello, world!</h1>
<p>Hi!</p>
<p><a href="https://example.com">https://example.com</a></p>`;

        const output = await build(null, content);
        expect(output).toBe(expected);
    });

    it('generates navigable hedings', async() => {
        const content = `# Hello, world!

Hi!

## Sub Heading

Hi again!

### &$Some,Crazy Crazy HEADING---`;
        const expected = `<h1 id="hello-world">Hello, world!</h1>
<p>Hi!</p>
<h2 id="sub-heading">Sub Heading</h2>
<p>Hi again!</p>
<h3 id="somecrazy-crazy-heading---">&#x26;$Some,Crazy Crazy HEADING---</h3>`;

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
        const expected = `<h1 id="hello-world">Hello, world!</h1>
<p>Hi!</p>`;
        let logger = null;
        let output = null;

        beforeEach(async() => {
            logger = arrayLogger();
            output = await build(null, content, { logger, footer });
        });

        it('renders correctly', () => {
            expect(output).toBe(expected);
        });

        it('emits a log message', () => {
            expect(logger.getMessages().some(msg => msg === 'Skipping card footer...')).toBe(true);
        });
    });

    describe('with images', () => {
        test('with github_urls handler', async() => {
            const content = `# Hello, world!

Hi!

![remote image](https://jlockard.com/image.png)

![local root image](/some/path/image.png)

![local relative image](some/path/image.png)`;
            const expected = `<h1 id="hello-world">Hello, world!</h1>
<p>Hi!</p>
<p><img src="https://jlockard.com/image.png" alt="remote image" style="width: auto;"></p>
<p><img src="https://raw.githubusercontent.com/ActiveEngagement/test/123/some/path/image.png" alt="local root image" style="width: auto;"></p>
<p><img src="https://raw.githubusercontent.com/ActiveEngagement/test/123/path/to/root/some/path/image.png" alt="local relative image" style="width: auto;"></p>`;
            const output = await build('path/to/root/card.md', content, {
                footer: false,
                imageHandler: 'github_urls'
            });
            expect(output).toBe(expected);
        });

        describe('with upload handler', () => {
            const content = `# Hello, world!

Hi!

![remote image](https://jlockard.com/image.png)

![local root image](/some/path/image1.png)

![local relative image](some/path/image2.png)`;
            const expected = `<h1 id="hello-world">Hello, world!</h1>
<p>Hi!</p>
<p><img src="https://jlockard.com/image.png" alt="remote image" style="width: auto;"></p>
<p><img src="some-image-link" alt="local root image" style="width: auto;"></p>
<p><img src="some-image-link" alt="local relative image" style="width: auto;"></p>`;
            let client = null;
            let output = null;

            beforeEach(async() => {
                client = createClient({ attachmentResult: { link: 'some-image-link' } });
                output = await build('path/to/root/card.md', content, {
                    client,
                    footer: false,
                    imageHandler: 'upload'
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

            it('correctly uploads the relative attachment', async() => {
                expect(client.getCalls()[1]).toMatchObject({
                    type: 'uploadAttachment',
                    fileName: 'image2.png',
                    filePath: 'path/to/root/some/path/image2.png'
                });
            });
        });
    });
});