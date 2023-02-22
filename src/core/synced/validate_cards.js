import { invalid } from 'ae_actions';

export default function(cards, name) {
    let i = 1;
    for(const card of cards) {
        if(typeof card !== 'string' && !card.glob) {
            return invalid(`"${name}" element ${i} has no glob!`);
        }
        i++;
    }
}