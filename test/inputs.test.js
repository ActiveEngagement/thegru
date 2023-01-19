import { InvalidInputsError } from '../src/error.js';
import getInputs from '../src/inputs.js';

const inputs = {
    user_email: 'test@example.com',
    user_token: 'test123',
    cards: JSON.stringify({ }),
    collection_id: '123',
    board_id: '123',
    board_section_id: '123',
    card_footer: 'Footer!',
    cards_file: 'something.json',
    image_handler: 'auto',
    debug_logging: 'false'
};

function getInput(name) {
    return inputs[name];
}

test('returns object', () => {
    expect(getInputs(getInput)).toStrictEqual({
        userEmail: 'test@example.com',
        userToken: 'test123',
        cards: { },
        collectionId: '123',
        boardId: '123',
        boardSectionId: '123',
        cardFooter: 'Footer!',
        cardsFile: 'something.json',
        imageHandler: 'auto',
        debugLogging: false
    });
});

test('user_email is required', () => {
    const f = () => {
        getInputs(name => name === 'user_email' ? '' : getInput(name));
    };
    expect(f).toThrow(InvalidInputsError);
    expect(f).toThrow('"user_email" is a required input!');
});

test('user_token is required', () => {
    const f = () => {
        getInputs(name => name === 'user_token' ? '' : getInput(name));
    };
    expect(f).toThrow(InvalidInputsError);
    expect(f).toThrow('"user_token" is a required input!');
});

test.each([
    ['', '"cards" is a required input!'],
    [null, '"cards" is a required input!'],
    ['invalid', '"cards" must be valid JSON!'],
    ['[]', '"cards" must be a valid JSON object with document paths as keys and card titles as values!'] 
])('cards throws error if missing or invalid json', (value, message) => {
    const f = () => {
        getInputs(name => name === 'cards' ? value : getInput(name));
    };
    expect(f).toThrow(InvalidInputsError);
    expect(f).toThrow(message);
});

test('collection_id is required', () => {
    const f = () => {
        getInputs(name => name === 'collection_id' ? '' : getInput(name));
    };
    expect(f).toThrow(InvalidInputsError);
    expect(f).toThrow('"collection_id" is a required input!');
});

test('board_id is not required', () => {
    const actual = getInputs(name => name === 'board_id' ? '' : getInput(name)).boardId;
    expect(actual).toBe(null);
});

test('board_section_id is not required', () => {
    const actual = getInputs(name => name === 'board_section_id' ? '' : getInput(name)).boardSectionId;
    expect(actual).toBe(null);
});

test('card_footer is not required', () => {
    const actual = getInputs(name => name === 'card_footer' ? '' : getInput(name)).cardFooter;
    expect(actual).toBe(null);
});

test('cards_file is not required and has default', () => {
    const actual = getInputs(name => name === 'cards_file' ? '' : getInput(name)).cardsFile;
    expect(actual).toBe('uploaded-guru-cards.json');
});

describe('debugLogging', () => {
    test('is not required and has default', () => {
        const actual = getInputs(name => name === 'debug_logging' ? '' : getInput(name)).debugLogging;
        expect(actual).toBe(false);
    });

    test('with true', () => {
        const actual = getInputs(name => name === 'debug_logging' ? 'true' : getInput(name)).debugLogging;
        expect(actual).toBe(true);
    });

    test('with false', () => {
        const actual = getInputs(name => name === 'debug_logging' ? 'false' : getInput(name)).debugLogging;
        expect(actual).toBe(false);
    });

    test('with something else throws error', () => {
        const f = () => getInputs(name => name === 'debug_logging' ? 'invalid' : getInput(name)).debugLogging;
        expect(f).toThrow(InvalidInputsError);
    });
});

describe('imageHandler', () => {
    test('is not required and has default', () => {
        const actual = getInputs(name => name === 'image_handler' ? '' : getInput(name)).imageHandler;
        expect(actual).toBe('auto');
    });

    test.each([
        ['auto'],
        ['github_urls'],
        ['upload']
    ])('with a valid option', (input) => {
        const actual = getInputs(name => name === 'image_handler' ? input : getInput(name)).imageHandler;
        expect(actual).toBe(input);
    });

    test('with invalid option throws error', () => {
        const f = () => getInputs(name => name === 'image_handler' ? 'invalid' : getInput(name));
        expect(f).toThrow(InvalidInputsError);
        expect(f).toThrow('"image_handler" must be one of [auto, github_urls, upload]');
    })
})
