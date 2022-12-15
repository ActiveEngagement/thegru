export default function flattenBoardCards(cards, sectionId = null) {
    return cards.flatMap(card => {
        if (card.type === 'section') {
            return flattenBoardCards(card.items, card.id);
        } else if (card.type === 'fact') {
            const newCard = Object.assign({}, card);
            if (sectionId) {
                newCard.sectionId = sectionId;
            }
            return [newCard];
        } else {
            return [];
        }
    })
}