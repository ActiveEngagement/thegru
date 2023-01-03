import { InvalidInputsError } from '../src/error.js';
import getInputs from '../src/inputs.js';

const inputs = {
    user_email: 'test@example.com',
    user_token: 'test123',
    file_path: 'test.md',
    card_title: 'Test',
    collection_id: '123',
    board_id: '123',
    board_section_id: '123',
    card_footer: 'Footer!'
};

function getInput(name) {
    return inputs[name];
}

test('returns object', () => {
    expect(getInputs(getInput)).toMatchObject({
        userEmail: 'test@example.com',
        userToken: 'test123',
        filePath: 'test.md',
        cardTitle: 'Test',
        collectionId: '123',
        boardId: '123',
        boardSectionId: '123',
        cardFooter: 'Footer!'
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

test('file_path is required', () => {
    const f = () => {
        getInputs(name => name === 'file_path' ? '' : getInput(name));
    };
    expect(f).toThrow(InvalidInputsError);
    expect(f).toThrow('"file_path" is a required input!');
});

test('card_title is required', () => {
    const f = () => {
        getInputs(name => name === 'card_title' ? '' : getInput(name));
    };
    expect(f).toThrow(InvalidInputsError);
    expect(f).toThrow('"card_title" is a required input!');
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
