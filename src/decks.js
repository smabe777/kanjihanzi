import kanjiData from './data/kanji.json';
import hanziData from './data/hanzi.json';

export const DECKS = {
  ja: {
    id: 'ja',
    name: 'Kanji',
    subtitle: 'Japanese · 2000 most frequent',
    accent: 'var(--ja)',
    list: kanjiData,
  },
  zh: {
    id: 'zh',
    name: 'Hanzi',
    subtitle: 'Chinese (simplified) · 2000 most frequent',
    accent: 'var(--zh)',
    list: hanziData,
  },
};

for (const deck of Object.values(DECKS)) {
  deck.byChar = new Map(deck.list.map((e) => [e.char, e]));
}

export function meaningOf(deckId, entry) {
  return deckId === 'ja' ? entry.meanings.join(', ') : entry.definition;
}

export function readingOf(deckId, entry) {
  if (deckId === 'ja') {
    const parts = [];
    if (entry.on?.length) parts.push(`on: ${entry.on.join('、')}`);
    if (entry.kun?.length) parts.push(`kun: ${entry.kun.join('、')}`);
    return parts.join('   ');
  }
  return entry.pinyin;
}

export function strokeDataUrl(deckId, char) {
  return `${import.meta.env.BASE_URL}strokes/${deckId}/${encodeURIComponent(char)}.json`;
}
