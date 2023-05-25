import createApi from '../../../../src/core/api.js';
import nullLogger from '../../../support/null_logger.js';
import arrayLogger from '../../../support/array_logger.js';
import transformBase from '../../../../src/core/synced/transform_content.js';
import * as predicates from '../../../../src/core/mdast_predicates.js';
import * as types from '../../../../src/core/synced/container_types.js';
import { image as buildImage, link as buildLink, text } from 'mdast-builder';
import createClient from '../../../support/api_client.js';
import env from '../../../support/env.js';
import { analysisBuilder, imageLinkAnalysis, link, image } from '../../../support/transform_content_util.js';
import { container, root } from '../../../../src/core/synced/tree/util.js';

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
    options.cards ||= [];
    options.tree ||= root();
    options.isFileCommitted ||= () => true;

    return transformBase(filePath, analysis, options);
}

describe('core/synced/transform_content.js', () => {
    beforeEach(() => {
        env({
            some: {
                path: {
                    'image.png': '[png',
                    'file.pdf': '[pdf]'
                },
                container: {}
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
                    root2: {
                        'card.md': 'content'
                    },
                    some: {
                        path: {
                            'image.png': '[png',
                            'file.pdf': '[pdf]'
                        }
                    },
                }
            },
        });
    });

    describe('with attachments', () => {
        let attachments, images, links;

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
            describe('with committed files', () => {
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

            describe('with uncommitted files', () => {
                let client;

                beforeEach(async() => {
                    client = createClient({
                        uploadAttachmentResult: { link: 'some/link' }
                    });
                    images = [
                        image('some/path/image.png', 'committed'),
                        image('some/path/file.pdf', 'uncommitted')
                    ];
                    ({ attachments } = await transform('path/to/root/card.md', imageLinkAnalysis(images, []), {
                        attachmentHandler: 'github_urls',
                        isFileCommitted: file => file === 'path/to/root/some/path/image.png'
                    }));
                });

                it('uses github_urls for the committed file', () => {
                    expect(images[0]).toStrictEqual(image('https://raw.githubusercontent.com/ActiveEngagement/test/123/path/to/root/some/path/image.png', 'committed'));
                });

                it('uses upload for the committed file', () => {
                    expect(images[1]).toStrictEqual(image('resources/path__to__root__some__path__file.pdf', 'uncommitted'));
                });
            });
        });

        describe('with upload handler', () => {
            let client;

            beforeEach(async() => {
                client = createClient();
                ({ attachments } = await transform('path/to/root/card.md', imageLinkAnalysis(images, links), {
                    attachmentHandler: 'upload',
                    client
                }));
            });

            it('rewrites the URLs', () => {
                expect(images).toStrictEqual([
                    image('https://jlockard.com/image.png', 'remote image'),
                    image('resources/some__path__image.png', 'local root image'),
                    image('resources/path__to__root__some__path__image.png', 'local dotslash image'),
                    image('resources/path__to__some__path__image.png', 'local parent image'),
                    image('resources/path__to__root__some__path__image.png', 'local relative image')
                ]);
                expect(links).toStrictEqual([
                    link('https://jlockard.com/something', 'remote link'),
                    link('resources/some__path__file.pdf', 'local root link'),
                    link('resources/path__to__root__some__path__file.pdf', 'local dotslash link'),
                    link('resources/path__to__some__path__file.pdf', 'local parent link'),
                    link('resources/path__to__root__some__path__file.pdf', 'local relative link')
                ]);
            });

            it('correctly collects and dedups the attachments', () => {
                expect(attachments).toStrictEqual([
                    {
                        id: 'some__path__image.png',
                        path: 'some/path/image.png'
                    },
                    {
                        id: 'path__to__root__some__path__image.png',
                        path: 'path/to/root/some/path/image.png'
                    },
                    {
                        id: 'path__to__some__path__image.png',
                        path: 'path/to/some/path/image.png'
                    },
                    {
                        id: 'some__path__file.pdf',
                        path: 'some/path/file.pdf'
                    },
                    {
                        id: 'path__to__root__some__path__file.pdf',
                        path: 'path/to/root/some/path/file.pdf'
                    },
                    {
                        id: 'path__to__some__path__file.pdf',
                        path: 'path/to/some/path/file.pdf'
                    },
                ]);
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

                client = createClient();

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
                        url: 'resources/some__path__image.png'
                    },
                    {
                        type: 'definition',
                        identifier: 'link-id',
                        label: 'Link',
                        url: 'resources/some__path__file.pdf'
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
                        attachmentHandler, client: createClient()
                    });
                });

                it('strips it', () => {
                    expect(imageNode.title).toBe(null);
                    expect(linkNode.title).toBe(null);
                });
            });

            describe('with nonexistent attachment paths', () => {
                const filePath = './path/to/nowhere';

                let logger, imageNode, linkNode;

                beforeEach(async() => {
                    logger = arrayLogger();

                    imageNode = image(filePath, 'bad image');
                    linkNode = link(filePath, 'bad link');

                    await transform('path/to/root/card.md', imageLinkAnalysis([imageNode], [linkNode]), {
                        logger, attachmentHandler, client: createClient()
                    });
                });

                it('does not rewrite them', () => {
                    expect(imageNode).toStrictEqual(image(filePath, 'bad image'));
                    expect(linkNode).toStrictEqual(link(filePath, 'bad link'));
                });

                it('generates appropriate log messages', () => {
                    const message = 'path/to/root/card.md referenced "./path/to/nowhere", which does not exist on the file system. We\'ll ignore it, but you likely have a broken link.';
                    expect(logger.getMessages().filter(msg => msg === message).length).toBe(2);
                });
            });

            describe('with directory image and link paths', () => {
                const filePath = '/some/path';

                let logger, imageNode, linkNode;

                beforeEach(async() => {
                    logger = arrayLogger();

                    imageNode = image(filePath, 'bad image');
                    linkNode = link(filePath, 'bad link');

                    await transform('path/to/root/card.md', imageLinkAnalysis([imageNode], [linkNode]), {
                        logger, attachmentHandler, client: createClient()
                    });
                });

                it('does not rewrite them', () => {
                    expect(imageNode).toStrictEqual(image(filePath, 'bad image'));
                    expect(linkNode).toStrictEqual(link(filePath, 'bad link'));
                });

                it('generates appropriate log message for image', () => {
                    const message = 'path/to/root/card.md referenced "/some/path", which is a directory. We\'ll ignore it, but you likely have a broken link.';
                    expect(logger.getMessages().filter(msg => msg === message).length).toBe(1);
                });

                it('generates appropriate log message for link', () => {
                    const message = 'path/to/root/card.md referenced "/some/path", which is a directory on the file system, but does not correspond to a Guru board, board section, or board group. We\'ll ignore it, but you likely have a broken link.';
                    expect(logger.getMessages().filter(msg => msg === message).length).toBe(1);
                });
            });
        });

        describe('with card/container links', () => {
            it('rewrites them correctly', async() => {
                const links = [
                    link('https://jlockard.com/something', 'remote link'),
                    link('/some/path/file.pdf', 'local root link'),
                    link('../root2/card1.md', 'card 1'),
                    link('/path/to/root2/card2.md', 'card 2'),
                    link('/path/to/root2/card.md', 'we cannot link to ourselves---this will be an attachment'),
                    link('/some', 'board group'),
                    link('/some/container', 'board')
                ];
                ({ attachments } = await transform('path/to/root/card.md', imageLinkAnalysis(images, links), {
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
                    ],
                    tree: root({
                        some: container({
                            container: container({}, { file: 'some/container', containerType: types.BOARD })
                        }, { file: 'some', containerType: types.BOARD_GROUP })
                    })
                }));
                expect(links).toStrictEqual([
                    link('https://jlockard.com/something', 'remote link'),
                    link('resources/some__path__file.pdf', 'local root link'),
                    link('cards/some__Long_special_card1name', 'card 1'),
                    link('cards/card2___name', 'card 2'),
                    link('resources/path__to__root2__card.md', 'we cannot link to ourselves---this will be an attachment'),
                    link('board-groups/some', 'board group'),
                    link('boards/some__container', 'board')
                ]);
            });
        });

        describe('with board section link', () => {
            let logger, linkNode;

            beforeEach(async() => {
                logger = arrayLogger();

                linkNode = link('/some/container', 'board section');

                await transform('path/to/root/card.md', imageLinkAnalysis([], [linkNode]), {
                    logger,
                    tree: root({
                        some: container({
                            container: container({}, { file: 'some/container', containerType: types.BOARD_SECTION })
                        }, { file: 'some', containerType: types.BOARD })
                    })
                });
            });

            it('does not rewrite them', () => {
                expect(linkNode).toStrictEqual(link('/some/container', 'board section'));
            });

            it('generates appropriate log message', () => {
                const message = 'path/to/root/card.md referenced "/some/container", which is a Guru board section. Since Guru board sections can\'t be linked to, we\'ll ignore it, but you likely have a broken link.';
                expect(logger.getMessages().filter(msg => msg === message).length).toBe(1);
            });
        });
    });
});