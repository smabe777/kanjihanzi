import { newCard, endOfToday, todayKey } from './srs.js';

export const cardId = (char, type) => `${char}:${type}`;

// Rolls the per-day new-card counter when the date changes.
export function rollDay(deck, now = Date.now()) {
  const today = todayKey(now);
  if (deck.newDate !== today) {
    return { ...deck, newDate: today, newToday: 0 };
  }
  return deck;
}

export function newRemainingToday(deck, newPerDay) {
  return Math.max(0, newPerDay - deck.newToday);
}

// Characters (in frequency order) not yet introduced.
export function nextNewChars(deck, charList, count) {
  const out = [];
  for (const entry of charList) {
    if (out.length >= count) break;
    if (!deck.cards[cardId(entry.char, 'recog')]) out.push(entry.char);
  }
  return out;
}

export function dueCounts(deck, now = Date.now()) {
  const eod = endOfToday(now);
  let learn = 0;
  let review = 0;
  let known = 0;
  const seen = new Set();
  for (const c of Object.values(deck.cards)) {
    if (c.state === 'learn' || c.state === 'relearn' || c.state === 'new') {
      if (c.due <= eod) learn += 1;
    } else if (c.state === 'review') {
      if (c.due <= eod) review += 1;
    }
    if (c.state === 'review' && !seen.has(c.char)) {
      seen.add(c.char);
      known += 1;
    }
  }
  return { learn, review, known };
}

// Picks the next card to study, or tells how long until one is ready.
// Priority: learning cards due now > reviews due today > new cards > learning
// cards due soon (shown early rather than making the user wait).
export function nextCard(deck, charList, newPerDay, now = Date.now()) {
  const eod = endOfToday(now);
  const cards = Object.values(deck.cards);

  const learnDue = cards
    .filter((c) => (c.state === 'learn' || c.state === 'relearn' || c.state === 'new') && c.due <= now)
    .sort((a, b) => a.due - b.due);
  if (learnDue.length) return { card: learnDue[0] };

  const reviewsDue = cards
    .filter((c) => c.state === 'review' && c.due <= eod)
    .sort((a, b) => a.due - b.due);
  if (reviewsDue.length) return { card: reviewsDue[0] };

  if (newRemainingToday(deck, newPerDay) > 0) {
    const [char] = nextNewChars(deck, charList, 1);
    if (char) return { introduce: char };
  }

  const learnSoon = cards
    .filter((c) => (c.state === 'learn' || c.state === 'relearn') && c.due > now)
    .sort((a, b) => a.due - b.due);
  if (learnSoon.length) {
    const waitMs = learnSoon[0].due - now;
    if (waitMs <= 10 * 60 * 1000) return { card: learnSoon[0] };
    return { waitMs };
  }

  return { done: true };
}

// Creates both card types for a character; recognition is studied first.
export function introduceChar(deck, char, now = Date.now()) {
  if (deck.cards[cardId(char, 'recog')]) return deck; // already introduced (e.g. double-run effect)
  const recog = newCard(char, 'recog');
  const draw = newCard(char, 'draw');
  recog.due = now;
  draw.due = now + 1; // sorts after the recognition card
  return {
    ...deck,
    newToday: deck.newToday + 1,
    cards: {
      ...deck.cards,
      [cardId(char, 'recog')]: recog,
      [cardId(char, 'draw')]: draw,
    },
  };
}
