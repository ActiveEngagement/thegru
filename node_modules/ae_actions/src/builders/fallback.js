import { result } from '../result.js';

export default function(builder, _factory, fallback) {
    return builder.use((value) => {
        if(value === null) {
            return result(fallback);
        }
    });
}