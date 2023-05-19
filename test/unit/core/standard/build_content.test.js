import buildBase from '../../../../src/core/standard/build_content.js';
import nullLogger from '../../../support/null_logger.js';
import createApi from '../../../../src/core/api.js';
import createClient from '../../../support/api_client.js';
import { resource } from '../../../support/util.js';
import env from '../../../support/env.js';

async function build(content, options = {}) {
    options.logger ||= nullLogger();
    if(options.client) {
        options.api ||= createApi(options.client, { logger: options.logger });
        delete options.client;
    }
    options.github ||= {};
    options.github.repo ||= {};
    options.github.repo.url ||= 'https://example.com/ActiveEngagement/test';
    options.github.repo.name ||= 'ActiveEngagement/test';
    options.github.commit ||= {};
    options.github.commit.sha ||= '123';
    options.inputs ||= {};
    options.attachmentHandler ||= 'github_urls';
    options.filePath ||= 'some/path/to.md';

    return await buildBase(content, options);
}

describe('core/standard/build_content.js', () => {
    beforeEach(() => {
        env({
            path: {
                to: {
                    'file.pdf': '[pdf]'
                }
            }
        });
    });
    describe('with basic markdown', () => {
        describe.each([
            [null],
            [undefined],
            [false],
        ])('without footer', (footer) => {
            it('renders and normalizes correctly', async() => {
                const result = await build(resource('markdown/basic_card.md'), { footer });
                expect(result.content).toBe(resource('markdown/basic_card_rendered.md'));
                expect(result.attachments).toStrictEqual([]);
            });
        });

        describe.each([
            ['Test123', 'Test123\n'],
            ['# Heading', '# Heading\n'],
            ['<{{repository_url}}>', '<https://example.com/ActiveEngagement/test>\n'],
        ])('with footer', (footer, expected) => {
            it('renders and normalizes correctly', async() => {
                const { content } = await build(resource('markdown/basic_card.md'), { footer });
                expect(content).toBe(resource('markdown/basic_card_rendered.md') + '\n' + expected);
            });
        });
    });

    describe('with local link', () => {
        it('rewrites it', async() => {
            const result = await build('[click here](../../path/to/file.pdf)');
            expect(result.content).toBe('[click here](https://raw.githubusercontent.com/ActiveEngagement/test/123/path/to/file.pdf)\n');
            expect(result.attachments).toStrictEqual([]);
        });
    });

    describe('with local image', () => {
        it('rewrites it', async() => {
            const result = await build('![click here](../../path/to/file.pdf)');
            expect(result.content).toBe('![click here](https://raw.githubusercontent.com/ActiveEngagement/test/123/path/to/file.pdf)\n');
            expect(result.attachments).toStrictEqual([]);
        });
    });

    describe('with autolink', () => {
        it('preserves it', async() => {
            const { content } = await build('<https://google.com>');
            expect(content).toBe('<https://google.com>\n');
        });
    });

    describe('with upload handler', () => {
        let result, client;

        beforeEach(async() => {
            client = createClient({
                uploadAttachmentResult: { link: 'https://example.com', attr: 1 }
            });
            result = await build('![click here](../../path/to/file.pdf)', {
                client,
                attachmentHandler: 'upload'
            });
        });

        it('rewrites it', () => {
            expect(result.content).toBe('![click here](https://example.com)\n');
        });

        it('correctly collects attachments', () => {
            expect(result.attachments).toStrictEqual([
                {
                    link: 'https://example.com',
                    attr: 1
                }
            ]);
        });
    });
});