export function valid() {
    return { valid: true };
}

export function invalid(message = undefined) {
    return { valid: false, message };
}

export function result(data = null) {
    return { valid: true, data };
}