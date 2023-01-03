export default function(response) {
    let text = null;

    response.readTextFromStream = response.text;

    response.text = async function() {
        text ||= await response.readTextFromStream();

        return text;
    };

    return response;
}