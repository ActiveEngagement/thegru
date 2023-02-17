import { invalid, result } from '../result.js';

export default function(builder) {
    return builder.use((value, name) => {
        switch (value) {
        case 'true':
            return result(true);
        case 'false':
            return result(false);
        default:
            return invalid(`"${name}" must be "true" or "false"!`);
        }
    });
}