import prepare from '../src/prepare.js';
import { resource } from './support/util.js';

test('correctly builds basic document', async() => {
    const doc = await resource('basic_markdown_test.md');
    const expected = await resource('basic_markdown_test_expectation.html');

    expect(await prepare(doc)).toBe(expected);
});

test('correctly builds images', async() => {
    const doc = await resource('markdown_images_test.md');
    const expected = await resource('markdown_images_test_expectation.html');

    function getImageUrl() {
        return "https://jlockard.com/new_path.png";
    }

    expect(await prepare(doc, { getImageUrl })).toBe(expected);
});