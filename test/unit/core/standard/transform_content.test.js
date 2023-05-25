import createApi from '../../../../src/core/api.js';
import nullLogger from '../../../support/null_logger.js';
import arrayLogger from '../../../support/array_logger.js';
import transformBase from '../../../../src/core/standard/transform_content.js';
import * as predicates from '../../../../src/core/mdast_predicates.js';
import { image as buildImage, link as buildLink, text } from 'mdast-builder';
import createClient from '../../../support/api_client.js';
import env from '../../../support/env.js';
import { analysisBuilder, imageLinkAnalysis, link, image } from '../../../support/transform_content_util.js';

async function transform(filePath, analysis, options = {}) {
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
    options.isFileCommitted ||= () => true;

    return transformBase(filePath, analysis, options);
}

describe('core/standard/transform_content.js', () => {
    beforeEach(() => {
        env({
            some: {
                path: {
                    'image.png': '[png',
                    'file.pdf': '[pdf]'
                }
            },
            path: {
                to: {
                    root: {
                        'card.md': '[md]',
                        some: {
                            path: {
                                'image.png': '[png',
                                'file.pdf': '[pdf]'
                            }
                        },
                    },
                    some: {
                        path: {
                            'image.png': '[png',
                            'file.pdf': '[pdf]'
                        }
                    },
                }
            }
        });
    });

    describe('with attachments', () => {
        let attachments, images, links;

        function defaultClient() {
            return createClient({ uploadAttachmentResult: { link: 'path' }});
        }

        beforeEach(() => {
            images = [
                image('https://jlockard.com/image.png', 'remote image'),
                image('/some/path/image.png', 'local root image'),
                image('./some/path/image.png', 'local dotslash image'),
                image('../some/path/image.png', 'local parent image'),
                image('some/path/image.png', 'local relative image')
            ];
            links = [
                link('https://jlockard.com/something', 'remote link'),
                link('/some/path/file.pdf', 'local root link'),
                link('./some/path/file.pdf', 'local dotslash link'),
                link('../some/path/file.pdf', 'local parent link'),
                link('some/path/file.pdf', 'local relative link')
            ];
        });

        describe('with github_urls handler', () => {
            beforeEach(async() => {
                ({ attachments } = await transform('path/to/root/card.md', imageLinkAnalysis(images, links), {
                    attachmentHandler: 'github_urls'
                }));
            });

            it('rewrites the URLs', () => {
                expect(images).toStrictEqual([
                    image('https://jlockard.com/image.png', 'remote image'),
                    image('https://raw.githubusercontent.com/ActiveEngagement/test/123/some/path/image.png', 'local root image'),
                    image('https://raw.githubusercontent.com/ActiveEngagement/test/123/path/to/root/some/path/image.png', 'local dotslash image'),
                    image('https://raw.githubusercontent.com/ActiveEngagement/test/123/path/to/some/path/image.png', 'local parent image'),
                    image('https://raw.githubusercontent.com/ActiveEngagement/test/123/path/to/root/some/path/image.png', 'local relative image')
                ]);
                expect(links).toStrictEqual([
                    link('https://jlockard.com/something', 'remote link'),
                    link('https://raw.githubusercontent.com/ActiveEngagement/test/123/some/path/file.pdf', 'local root link'),
                    link('https://raw.githubusercontent.com/ActiveEngagement/test/123/path/to/root/some/path/file.pdf', 'local dotslash link'),
                    link('https://raw.githubusercontent.com/ActiveEngagement/test/123/path/to/some/path/file.pdf', 'local parent link'),
                    link('https://raw.githubusercontent.com/ActiveEngagement/test/123/path/to/root/some/path/file.pdf', 'local relative link')
                ]);
            });

            it('collects no attachments', () => {
                expect(attachments.length).toBe(0);
            });
        });

        describe('with upload handler', () => {
            let client;

            beforeEach(async() => {
                client = defaultClient();
                ({ attachments } = await transform('path/to/root/card.md', imageLinkAnalysis(images, links), {
                    attachmentHandler: 'upload',
                    client
                }));
            });

            it('rewrites the URLs', () => {
                expect(images).toStrictEqual([
                    image('https://jlockard.com/image.png', 'remote image'),
                    image('path', 'local root image'),
                    image('path', 'local dotslash image'),
                    image('path', 'local parent image'),
                    image('path', 'local relative image')
                ]);
                expect(links).toStrictEqual([
                    link('https://jlockard.com/something', 'remote link'),
                    link('path', 'local root link'),
                    link('path', 'local dotslash link'),
                    link('path', 'local parent link'),
                    link('path', 'local relative link')
                ]);
            });

            // Notice how the attachments are duplicated. With standard actions this is DESIRABLE, since each entry
            // here actually corresponds to a whole separate Guru Attachment.
            // [TODO]: In the future, it would be better to try to only create one Guru Attachment per path.
            it('correctly collects the attachments', () => {
                expect(attachments.length).toBe(8);
            });
        });

        describe('with references', () => {
            let imageReference, linkReference, definitions, client;

            function generateImageReference() {
                return {
                    type: 'imageReference',
                    identifier: 'image-id',
                    label: 'Image Id',
                    referenceType: 'full',
                    alt: 'image'
                };
            }

            function generateLinkReference() {
                return {
                    type: 'linkReference',
                    identifier: 'link-id',
                    label: 'Link Id',
                    referenceType: 'full',
                    children: [ text('link') ]
                };
            }

            beforeEach(async() => {
                imageReference = generateImageReference();
                linkReference = generateLinkReference();
                definitions = [
                    {
                        type: 'definition',
                        identifier: 'image-id',
                        label: 'Image',
                        url: '/some/path/image.png'
                    },
                    {
                        type: 'definition',
                        identifier: 'link-id',
                        label: 'Link',
                        url: '/some/path/file.pdf'
                    },
                ];

                const analysis = analysisBuilder()
                    .add(predicates.imageReference, [imageReference])
                    .add(predicates.linkReference, [linkReference])
                    .add(predicates.definition, definitions)
                    .build();

                client = defaultClient();

                ({ attachments } = await transform('path/to/root/card.md', analysis, {
                    attachmentHandler: 'upload',
                    client
                }));
            });

            it('does not change the references themselves', () => {
                expect(imageReference).toStrictEqual(generateImageReference());
                expect(linkReference).toStrictEqual(generateLinkReference());
            });

            it('rewrites the definitions\' URLs', () => {
                expect(definitions).toStrictEqual([
                    {
                        type: 'definition',
                        identifier: 'image-id',
                        label: 'Image',
                        url: 'path'
                    },
                    {
                        type: 'definition',
                        identifier: 'link-id',
                        label: 'Link',
                        url: 'path'
                    }
                ]);
            });

            it('correctly collects the attachments', () => {
                expect(attachments.length).toBe(2);
            });
        });

        describe.each([
            ['upload'],
            ['github_urls']
        ])('with either attachment handler', attachmentHandler => {
            describe('with title', () => {
                let imageNode, linkNode;

                beforeEach(async() => {
                    imageNode = buildImage('/some/path/image.png', 'Some title to be stripped', 'desc');
                    linkNode = buildLink('/some/path/image.png', 'Some title to be stripped', text('desc'));

                    await transform('path/to/root/card.md', imageLinkAnalysis([imageNode], [linkNode]), {
                        attachmentHandler, client: defaultClient()
                    });
                });

                it('strips it', () => {
                    expect(imageNode.title).toBe(null);
                    expect(linkNode.title).toBe(null);
                });
            });

            describe.each([
                ['./path/to/nowhere', 'path/to/root/card.md referenced "./path/to/nowhere", which does not exist on the file system. We\'ll ignore it, but you likely have a broken link.'],
                ['/some/path', 'path/to/root/card.md referenced "/some/path", which is a directory. We\'ll ignore it, but you likely have a broken link.']
            ])('with invalid attachment paths', (filePath, message) => {
                let logger, imageNode, linkNode;

                beforeEach(async() => {
                    logger = arrayLogger();

                    imageNode = image(filePath, 'bad image');
                    linkNode = link(filePath, 'bad link');

                    await transform('path/to/root/card.md', imageLinkAnalysis([imageNode], [linkNode]), {
                        logger, attachmentHandler, client: defaultClient()
                    });
                });

                it('does not rewrite them', () => {
                    expect(imageNode).toStrictEqual(image(filePath, 'bad image'));
                    expect(linkNode).toStrictEqual(link(filePath, 'bad link'));
                });

                it('generates appropriate log messages', () => {
                    expect(logger.getMessages().filter(msg => msg === message).length).toBe(2);
                });
            });
        });
    });
});