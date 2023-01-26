export default function() {
    return {
        debug(message) {
            console.log(message);
        },
        info(message) {
            console.log(message);
        },
        warning(message) {
            console.log(message);
        },
        startGroup(name) {
            console.log('===' + name + '===');
        },
        endGroup() {
            console.log('=========');
        },
        isDebug() {
            return true;
        }
    };
}