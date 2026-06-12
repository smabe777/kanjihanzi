const KEY = 'hanzi-kanji-trainer-v1';
const AUTH_KEY = 'hanzi-kanji-trainer-auth';

const DEFAULTS = {
  settings: { newPerDay: 10 },
  decks: {
    ja: { cards: {}, newDate: '', newToday: 0 },
    zh: { cards: {}, newDate: '', newToday: 0 },
  },
  updatedAt: 0,
};

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULTS);
    const parsed = JSON.parse(raw);
    return normalizeState(parsed);
  } catch {
    return structuredClone(DEFAULTS);
  }
}

// Coerces any stored/imported/synced progress object into the current shape.
export function normalizeState(parsed) {
  return {
    settings: { ...DEFAULTS.settings, ...parsed.settings },
    decks: {
      ja: { ...structuredClone(DEFAULTS.decks.ja), ...parsed.decks?.ja },
      zh: { ...structuredClone(DEFAULTS.decks.zh), ...parsed.decks?.zh },
    },
    updatedAt: Number(parsed.updatedAt) || 0,
  };
}

export function loadAuth() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY)) || null;
  } catch {
    return null;
  }
}

export function saveAuth(auth) {
  if (auth) localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
  else localStorage.removeItem(AUTH_KEY);
}

export function saveState(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
}

export function exportState(state) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `hanzi-kanji-progress-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importStateFile(file) {
  return file.text().then((text) => {
    const parsed = JSON.parse(text);
    if (!parsed.decks || (!parsed.decks.ja && !parsed.decks.zh)) {
      throw new Error('Not a valid progress file');
    }
    return parsed;
  });
}
