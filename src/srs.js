// SM-2 style spaced repetition (Anki-like), with short learning steps.
// Grades: 0 = Again, 2 = Hard, 3 = Good, 4 = Easy

const MIN = 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;
const LEARNING_STEPS = [1 * MIN, 10 * MIN];
const GRADUATE_DAYS = 1;
const EASY_DAYS = 4;
const MIN_EASE = 1.3;

export const GRADES = [
  { value: 0, label: 'Again', key: '1' },
  { value: 2, label: 'Hard', key: '2' },
  { value: 3, label: 'Good', key: '3' },
  { value: 4, label: 'Easy', key: '4' },
];

export function newCard(char, type) {
  return {
    char,
    type, // 'recog' | 'draw'
    state: 'new', // 'new' | 'learn' | 'review' | 'relearn'
    step: 0,
    ease: 2.5,
    interval: 0, // days
    due: 0, // ms epoch; 0 = available now
    reps: 0,
    lapses: 0,
  };
}

export function gradeCard(card, grade, now = Date.now()) {
  const c = { ...card, reps: card.reps + 1 };

  if (c.state === 'new') {
    c.state = 'learn';
    c.step = 0;
  }

  if (c.state === 'learn' || c.state === 'relearn') {
    if (grade === 0) {
      c.step = 0;
      c.due = now + LEARNING_STEPS[0];
    } else if (grade === 2) {
      c.due = now + LEARNING_STEPS[c.step] * 1.5;
    } else if (grade === 3) {
      c.step += 1;
      if (c.step >= LEARNING_STEPS.length) {
        graduate(c, c.state === 'relearn' ? Math.max(1, Math.round(c.interval * 0.5)) : GRADUATE_DAYS, now);
      } else {
        c.due = now + LEARNING_STEPS[c.step];
      }
    } else {
      graduate(c, c.state === 'relearn' ? Math.max(2, Math.round(c.interval * 0.7)) : EASY_DAYS, now);
    }
    return c;
  }

  // review
  if (grade === 0) {
    c.lapses += 1;
    c.ease = Math.max(MIN_EASE, c.ease - 0.2);
    c.state = 'relearn';
    c.step = 0;
    c.due = now + LEARNING_STEPS[0];
  } else if (grade === 2) {
    c.ease = Math.max(MIN_EASE, c.ease - 0.15);
    c.interval = Math.max(c.interval + 1, Math.round(c.interval * 1.2));
    c.due = now + c.interval * DAY;
  } else if (grade === 3) {
    c.interval = Math.max(c.interval + 1, Math.round(c.interval * c.ease));
    c.due = now + c.interval * DAY;
  } else {
    c.ease += 0.15;
    c.interval = Math.max(c.interval + 1, Math.round(c.interval * c.ease * 1.3));
    c.due = now + c.interval * DAY;
  }
  return c;
}

function graduate(c, days, now) {
  c.state = 'review';
  c.interval = days;
  c.due = now + days * DAY;
}

// Human preview of what each grade would schedule, e.g. "10m" / "3d"
export function previewInterval(card, grade, now = Date.now()) {
  const next = gradeCard(card, grade, now);
  const ms = next.due - now;
  if (ms < 60 * MIN) return `${Math.max(1, Math.round(ms / MIN))}m`;
  if (ms < DAY) return `${Math.round(ms / (60 * MIN))}h`;
  const d = Math.round(ms / DAY);
  if (d < 31) return `${d}d`;
  if (d < 365) return `${(d / 30.4).toFixed(1)}mo`;
  return `${(d / 365).toFixed(1)}y`;
}

export function endOfToday(now = Date.now()) {
  const d = new Date(now);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function todayKey(now = Date.now()) {
  const d = new Date(now);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
