import handleBase from '../../../../src/core/standard/handle_card.js';
import nullLogger from '../../../support/null_logger.js';
import createApi from '../../../../src/core/api.js';
import createClient from '../../../support/api_client.js';
import { apiCall, createCardApiCall, resource, updateCardApiCall } from '../../../support/util.js';
import env from '../../../support/env.js';
import arrayLogger from '../../../support/array_logger.js';

async function handle(filePath, title, existingId, options = {}) {
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

    return await handleBase(filePath, title, existingId, options);
}

describe('core/standard/handle_card.js', () => {
    beforeEach(() => {
        env({
            'with_attachments.md': resource('markdown/card_with_attachments.md'),
            'basic.md': resource('markdown/basic_card.md'),
            path: {
                to: {
                    'file.pdf': '[pdf]',
                    'image.png': '[png]'
                }
            }
        });
    });

    describe('with no existing card', () => {
        describe('with no attachments', () => {
            let result, client, logger;

            beforeEach(async() => {
                logger = arrayLogger();
                client = createClient({
                    createCardResult: { id: 'newId123' }
                });
                result = await handle('basic.md', 'Test', null, {
                    client,
                    logger,
                    inputs: {
                        collectionId: 'c123',
                    }
                });
            });

            it('creates the card', () => {
                expect(client.getCalls()[0]).toStrictEqual(createCardApiCall({
                    preferredPhrase: 'Test',
                    content: resource('markdown/basic_card_rendered.md'),
                    boards: [],
                    collection: { id: 'c123' }
                }));
            });

            it('returns the new id', () => {
                expect(result).toBe('newId123');
            });

            it('emits an appropriate log message', () => {
                expect(logger.getMessages().some(m => m.startsWith('No previously uploaded card found.'))).toBe(true);
            });
        });

        describe('with attachments', () => {
            describe('with upload handler', () => {
                let result, client;

                beforeEach(async() => {
                    client = createClient({
                        createCardResult: { id: 'newId123' },
                        attachmentResult: {
                            link: 'some/path.pdf',
                            filename: 'path.pdf',
                            attachmentId: 'a213',
                            mimeType: 'application/pdf',
                            size: 456
                        }
                    });
                    result = await handle('with_attachments.md', 'Test', null, {
                        client,
                        inputs: {
                            collectionId: 'c123',
                        },
                        attachmentHandler: 'upload'
                    });
                });

                it('creates the card', () => {
                    expect(client.getCalls()[2]).toStrictEqual(createCardApiCall({
                        preferredPhrase: 'Test',
                        content: resource('markdown/card_with_attachments.md')
                            .replaceAll('path/to/image.png', 'some/path.pdf')
                            .replaceAll('path/to/file.pdf', 'some/path.pdf'),
                        boards: [],
                        collection: { id: 'c123' },
                        attachments: [
                            {
                                extension: 'pdf',
                                link: 'some/path.pdf',
                                filename: 'path.pdf',
                                id: 'a213',
                                mimetype: 'application/pdf',
                                size: 456
                            },
                            {
                                extension: 'pdf',
                                link: 'some/path.pdf',
                                filename: 'path.pdf',
                                id: 'a213',
                                mimetype: 'application/pdf',
                                size: 456
                            }
                        ]
                    }));
                });

                it('returns the new id', () => {
                    expect(result).toBe('newId123');
                });
            });
            describe('with github_urls handler', () => {
                let result, client;

                beforeEach(async() => {
                    client = createClient({
                        createCardResult: { id: 'newCard123' }
                    });
                    result = await handle('with_attachments.md', 'Test', null, {
                        client,
                        inputs: {
                            collectionId: 'c123',
                        },
                        attachmentHandler: 'github_urls'
                    });
                });

                it('creates the card', () => {
                    expect(client.getCalls()[0]).toStrictEqual(createCardApiCall({
                        preferredPhrase: 'Test',
                        content: resource('markdown/card_with_attachments.md')
                            .replaceAll('path/to/image.png', 'https://raw.githubusercontent.com/ActiveEngagement/test/123/path/to/image.png')
                            .replaceAll('path/to/file.pdf', 'https://raw.githubusercontent.com/ActiveEngagement/test/123/path/to/file.pdf'),
                        boards: [],
                        collection: { id: 'c123' },
                    }));
                });
            });
        });
    });

    describe('with nonexistent existing card', () => {
        let result, client, logger;

        beforeEach(async() => {
            logger = arrayLogger();
            client = createClient({
                createCardResult: { id: 'newId123' },
                getCardResult: 'not_found'
            });
            result = await handle('basic.md', 'Test', 'test123', {
                client,
                logger,
                inputs: {
                    collectionId: 'c123',
                }
            });
        });

        it('creates the card', () => {
            expect(client.getCalls()[1]).toStrictEqual(createCardApiCall({
                preferredPhrase: 'Test',
                content: resource('markdown/basic_card_rendered.md'),
                boards: [],
                collection: { id: 'c123' }
            }));
        });

        it('returns the new id', () => {
            expect(result).toBe('newId123');
        });

        it('emits an appropriate log message', () => {
            expect(logger.getMessages().some(m => m.startsWith('Previously uploaded card test123 no longer exists.'))).toBe(true);
        });
    });

    describe('with archived existing card', () => {
        let result, client, logger;

        beforeEach(async() => {
            logger = arrayLogger();
            client = createClient({
                createCardResult: { id: 'newId123' },
                getCardResult: { id: 'test123', archived: true }
            });
            result = await handle('basic.md', 'Test', 'test123', {
                client,
                logger,
                inputs: {
                    collectionId: 'c123',
                }
            });
        });

        it('creates the card', () => {
            expect(client.getCalls()[1]).toStrictEqual(createCardApiCall({
                preferredPhrase: 'Test',
                content: resource('markdown/basic_card_rendered.md'),
                boards: [],
                collection: { id: 'c123' }
            }));
        });

        it('returns the new id', () => {
            expect(result).toBe('newId123');
        });

        it('emits an appropriate log message', () => {
            expect(logger.getMessages().some(m => m.startsWith('Previously uploaded card test123 no longer exists.'))).toBe(true);
        });
    });

    describe('with an existing card', () => {
        describe('with no attachments', () => {
            let result, client, logger;

            beforeEach(async() => {
                logger = arrayLogger();
                client = createClient({
                    getCardResult: { id: 'test123' }
                });
                result = await handle('basic.md', 'Test', 'test123', {
                    client,
                    logger,
                    inputs: {
                        collectionId: 'c123',
                    }
                });
            });

            it('updates the card', () => {
                expect(client.getCalls()[1]).toStrictEqual(updateCardApiCall('test123', {
                    id: 'test123',
                    preferredPhrase: 'Test',
                    content: resource('markdown/basic_card_rendered.md')
                }));
            });

            it('returns the old id', () => {
                expect(result).toBe('test123');
            });

            it('emits an appropriate log message', () => {
                expect(logger.getMessages().some(m => m.startsWith('Updating previously uploaded card test123'))).toBe(true);
            });
        });

        describe('with attachments', () => {
            let result, client;

            beforeEach(async() => {
                client = createClient({
                    createCardResult: { id: 'newId123' },
                    attachmentResult: {
                        link: 'some/path.pdf',
                        filename: 'path.pdf',
                        attachmentId: 'a213',
                        mimeType: 'application/pdf',
                        size: 456
                    }
                });
                result = await handle('with_attachments.md', 'Test', null, {
                    client,
                    inputs: {
                        collectionId: 'c123',
                    },
                    attachmentHandler: 'upload'
                });
            });

            it('creates the card', () => {
                expect(client.getCalls()[2]).toStrictEqual(createCardApiCall({
                    preferredPhrase: 'Test',
                    content: resource('markdown/card_with_attachments.md')
                        .replaceAll('path/to/image.png', 'some/path.pdf')
                        .replaceAll('path/to/file.pdf', 'some/path.pdf'),
                    boards: [],
                    collection: { id: 'c123' },
                    attachments: [
                        {
                            extension: 'pdf',
                            link: 'some/path.pdf',
                            filename: 'path.pdf',
                            id: 'a213',
                            mimetype: 'application/pdf',
                            size: 456
                        },
                        {
                            extension: 'pdf',
                            link: 'some/path.pdf',
                            filename: 'path.pdf',
                            id: 'a213',
                            mimetype: 'application/pdf',
                            size: 456
                        }
                    ]
                }));
            });

            it('returns the new id', () => {
                expect(result).toBe('newId123');
            });
        });
    });

    describe('with a footer', () => {
        it('attaches it', async() => {
            const client = createClient();
            await handle('basic.md', 'Test', null, {
                footer: 'footer',
                client
            });
            const content = client.getCalls()[0].options.body.content;
            expect(content).toBe(resource('markdown/basic_card_rendered.md') + '\nfooter\n');
        });
    });
});