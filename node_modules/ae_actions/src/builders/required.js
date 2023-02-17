import { invalid } from '../result.js';

export default function(builder) {
    return builder.use((value, name) => {
        if(value === null) {
            return invalid(`"${name}" is a required input!`);
        }
    });
}