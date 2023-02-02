export function base64(input) {
    return Buffer.from(input, 'utf8').toString('base64');
}
