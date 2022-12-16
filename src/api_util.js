export function flattenBoardCards(cards, sectionId = null) {
    return cards.flatMap(card => {
        if(card.type === 'section') {
            return flattenBoardCards(card.items, card.id);
        }
        else if(card.type === 'fact') {
            const newCard = Object.assign({}, card);
            if(sectionId) {
                newCard.sectionId = sectionId;
            }
            return [newCard];
        }
        else {
            return [];
        }
    });
}

export function wrapGuruMarkdown(input) {
    // The deprecated escape function is REQUIRED here, since Guru seems to use unescape on their end.
    return `<div class="ghq-card-content__markdown" data-ghq-card-content-type="MARKDOWN" data-ghq-card-content-markdown-content="${escape(input)}"></div>`;
}