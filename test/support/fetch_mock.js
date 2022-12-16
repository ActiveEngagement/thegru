export default function(options = {}) {
    const baseEndpoint = options.endpoint || 'https://api.getguru.com/api/v1/';

    function endpoint(path = null) {
        if(!path) return baseEndpoint;

        return new URL(path, baseEndpoint).href;
    }

    function fetch(url, fetchOptions = {}) {
        calls.push({ url, options: fetchOptions });
    }

    const calls = [];
}