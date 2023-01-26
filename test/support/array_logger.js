export default function() {
    const messages = [];

    return {
        debug(message) {
            messages.push(message);
        },
        info(message) {
            messages.push(message);
        },
        warning(message) {
            messages.push(message);
        },
        startGroup(name) {
            messages.push('===' + name + '===');
        },
        endGroup() {
            messages.push('=========');
        },
        isDebug() {
            return true;
        },
        getMessages() {
            return messages;
        }
    };
}