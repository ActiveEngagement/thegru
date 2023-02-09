import path from 'path';
import { readFile } from '../../src/core/fs_util.js';

export async function resource(filePath) {
    return await readFile(path.join('test/resources', filePath));
}

export function apiCall(type, body) {
    return {
        type,
        options: {
            body,
            headers: {
                accept: 'application/json',
                authorization: 'Basic dW5kZWZpbmVkOnVuZGVmaW5lZA==',
                'content-type': 'application/json'
            }
        }
    };
}

export function createCardApiCall(options) {
    options.attachments ||= [];
    return apiCall('createCard', {
        shareStatus: 'TEAM',
        ...options
    });
}

export function updateCardApiCall(options) {
    options.attachments ||= [];
    return apiCall('updateCard', options);
}
